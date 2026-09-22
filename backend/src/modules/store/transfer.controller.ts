import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { StoreInwardEntry } from './storeInwardEntry.schema';
import { PurchaseInvoice } from '../purchases/purchaseInvoice.schema';
import Item from '../items/item.model';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { ContractorReturn } from '../contractors/contractorReturn.schema';
import { StoreTransfer } from './storeTransfer.schema';
import { Mhrov } from './mhrov.schema';
import { WipRegister } from '../wip/wip.schema';
import { JmcRegister } from '../jmc/jmc.schema';
import { SummaryService } from '../reports/summary/summary.service';
import { expandCircle } from '../../utils/hierarchy';
// 
// NEW API: Filter Options for MHROV DI Search
// 
// ADMIN ROUTES

export async function buildStockSummaryData(circleFilter?: string, packageFilter?: string, contractorId?: string) {
  let contractorFilter: any = null;
  if (contractorId) {
    const cIdStr = String(contractorId).trim();
    const cIdObj = mongoose.Types.ObjectId.isValid(cIdStr) ? new mongoose.Types.ObjectId(cIdStr) : cIdStr;
    contractorFilter = { $in: [cIdStr, cIdObj] };
  }

  // Build filters for Inward, Assignments, Returns
  const inwardFilter: any = { status: { $in: ['Verified', 'Approved'] } };
  if (circleFilter) inwardFilter.circle = { $regex: new RegExp(`^${circleFilter}$`, 'i') };
  if (packageFilter) inwardFilter.package = packageFilter;

  const assignmentFilter: any = { status: 'Sent' };
  // if (contractorFilter) assignmentFilter.contractorId = contractorFilter; // Removed so we fetch ALL assignments to get true store balance
  if (circleFilter) {
    assignmentFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { circle: { $exists: false } },
      { circle: null },
      { circle: '' }
    ];
  }

  const returnsFilter: any = { status: { $in: ['Submitted', 'Approved'] } };
  // if (contractorFilter) returnsFilter.contractorId = contractorFilter; // Removed so we fetch ALL returns to get true store balance
  if (circleFilter) {
    returnsFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { circle: { $exists: false } },
      { circle: null },
      { circle: '' }
    ];
  }

  const wipJmcFilter: any = { status: { $ne: 'Rejected' } };
  if (contractorFilter) wipJmcFilter.contractorId = contractorFilter;
  if (circleFilter) {
    wipJmcFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { circle: { $exists: false } },
      { circle: null },
      { circle: '' }
    ];
  }


  const mhrovFilter: any = {};
  if (circleFilter) {
    mhrovFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { circle: { $exists: false } },
      { circle: null },
      { circle: '' }
    ];
  }

  console.log("Fetching DB collections in parallel...");
  // Fetch all collections in parallel to massively improve performance (fixes Axios timeouts)
  const [
    items,
    verifiedInwards,
    assignments,
    contractorReturns,
    transfers,
    wipRecords,
    jmcRecords,
    mhrovs
  ] = await Promise.all([
    Item.find({ isDeleted: false }).lean(),
    StoreInwardEntry.find(inwardFilter).lean(),
    ContractorAssignment.find(assignmentFilter).lean(),
    ContractorReturn.find(returnsFilter).lean(),
    StoreTransfer.find({ status: 'RECEIVED' }).lean(),
    WipRegister.find(wipJmcFilter).lean(),
    JmcRegister.find(wipJmcFilter).lean(),
    Mhrov.find(mhrovFilter).lean()
  ]);
  console.log("Fetched all DB collections successfully!");

  // 5. Aggregate data per item
  const summaryMap: Record<string, any> = {};

  items.forEach(item => {
    const data = item.dynamicData || {};
    const tempCode = data.tempCode || data.temp_code || '';
    const activity = data.activity || data.itemActivity || 'Uncategorized Activity';
    const loaSrNo = data.loaSrNo || data.loaSerialNo || data.loaSerialNumber || data.sku || '';
    
    const cLower = circleFilter ? circleFilter.toLowerCase() : '';
    const circleLoaQty = Number(cLower ? (data[`${cLower}LoaQuantity`] || 0) : (data.loaQuantity || 0));

    if (!summaryMap[tempCode]) {
      summaryMap[tempCode] = {
        itemId: item._id,
        sr: 0,
        tempCode: tempCode,
        activity: activity,
        hsnCode: data.hsnCode || data.hsn_code || '-',
        description: data.name || data.description || '-',
        unit: data.unit || 'Nos',
        loaSrNo: loaSrNo,
        circleLoaQty: circleLoaQty,
        allActivities: new Set<string>(),
        allLoaSrs: new Set<string>(),
        activityDetailsMap: {} as Record<string, { loaSrNo: string, description: string }>,
        challanQty: 0,
        receivedQty: 0,
      rejectedQty: 0,
      acceptedQty: 0,
      mhrovQty: 0,
      receivedFromOtherStore: 0,
      totalInStockAfterReceive: 0,
      transferToOtherStore: 0,
      contractorsIssuedQty: 0,
      contractorsReturnQty: 0,
      contractorsActualIssued: 0,
      allContractorsIssuedQty: 0,
      allContractorsReturnQty: 0,
      allContractorsActualIssued: 0,
      wipConsumed: 0,
      jmcDone: 0,
      totalBalanceQty: 0,
      remarks: '',
      // Latest GRN details
      invoiceNumber: '-',
      invoiceDate: null,
      poNumber: '-',
      poDate: null,
      vendorName: '-',
      transportName: '-',
      truckNumber: '-',
      grNumber: '-',
      grDate: null,
      biltyNumber: '-',
      receivedDate: null,
      packType: '-',
      packQty: 0,
      rate: 0,
      taxableAmount: 0,
      gst: '-'
    };
    } else {
      summaryMap[tempCode].circleLoaQty += circleLoaQty;
    }
    
    if (activity) {
      summaryMap[tempCode].allActivities.add(activity);
      if (!summaryMap[tempCode].activityDetailsMap[activity]) {
        summaryMap[tempCode].activityDetailsMap[activity] = [];
      }
      summaryMap[tempCode].activityDetailsMap[activity].push({
        itemId: item._id,
        loaSrNo: loaSrNo,
        description: data.name || data.description || '-'
      });
    }
    if (loaSrNo) summaryMap[tempCode].allLoaSrs.add(loaSrNo);
  });

  // Calculate Inwards
  verifiedInwards.forEach(inward => {
    const tc = inward.tempCode || '';
    if (summaryMap[tc]) {
      const totalPackingListQty = inward.packingList?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0;
      const invQty = inward.invoiceQty || 0;
      
      summaryMap[tc].challanQty += invQty;
      summaryMap[tc].receivedQty += totalPackingListQty;
      summaryMap[tc].rejectedQty += (inward.rejectedQty || 0);
      
      // Calculate derived fields
      summaryMap[tc].acceptedQty = summaryMap[tc].receivedQty - summaryMap[tc].rejectedQty;
      summaryMap[tc].totalInStockAfterReceive = summaryMap[tc].acceptedQty + summaryMap[tc].receivedFromOtherStore;
      
      // Update with latest GRN details
      summaryMap[tc].invoiceNumber = inward.invoiceNumber || summaryMap[tc].invoiceNumber;
      summaryMap[tc].invoiceDate = inward.invoiceDate || summaryMap[tc].invoiceDate;
      summaryMap[tc].poNumber = inward.poNumber || summaryMap[tc].poNumber;
      summaryMap[tc].poDate = inward.poDate || summaryMap[tc].poDate;
      summaryMap[tc].vendorName = inward.vendorName || summaryMap[tc].vendorName;
      summaryMap[tc].transportName = inward.transportName || summaryMap[tc].transportName;
      summaryMap[tc].truckNumber = inward.truckNumber || summaryMap[tc].truckNumber;
      summaryMap[tc].grNumber = inward.grNumber || summaryMap[tc].grNumber;
      summaryMap[tc].grDate = inward.grDate || summaryMap[tc].grDate;
      summaryMap[tc].biltyNumber = inward.biltyNumber || summaryMap[tc].biltyNumber;
      summaryMap[tc].receivedDate = inward.receivedDate || summaryMap[tc].receivedDate;
      summaryMap[tc].rate = inward.rate || summaryMap[tc].rate;
      summaryMap[tc].taxableAmount = inward.taxableAmount || summaryMap[tc].taxableAmount;
      summaryMap[tc].gst = inward.gst || summaryMap[tc].gst;
      summaryMap[tc].remarks = inward.remarks || summaryMap[tc].remarks;
      
      if (inward.packingList && inward.packingList.length > 0) {
        summaryMap[tc].packType = inward.packingList[0].packType || summaryMap[tc].packType;
        summaryMap[tc].packQty = inward.packingList[0].quantity || summaryMap[tc].packQty;
      }
    }
  });

  // Calculate MRHOV Qty
  mhrovs.forEach((mhrov: any) => {
    (mhrov.items || []).forEach((it: any) => {
      const tc = it.tempCode || '';
      if (summaryMap[tc]) {
        summaryMap[tc].mhrovQty += Number(it.mhrovDoneQty || 0);
      }
    });
  });

  // Calculate Contractor Assignments
  assignments.forEach(assignment => {
    const isThisContractor = contractorFilter ? (
      assignment.contractorId?.toString() === String(contractorId).trim() || 
      String(assignment.contractorId) === String(contractorId).trim()
    ) : true;
    
    assignment.lineItems?.forEach((line: any) => {
      const tc = line.tempCode || '';
      if (summaryMap[tc]) {
        const qty = line.quantity || 0;
        summaryMap[tc].allContractorsIssuedQty += qty;
        if (isThisContractor) {
          summaryMap[tc].contractorsIssuedQty += qty;
        }
      }
    });
  });

  // Calculate Contractor Returns
  contractorReturns.forEach(ret => {
    const isThisContractor = contractorFilter ? (
      ret.contractorId?.toString() === String(contractorId).trim() || 
      String(ret.contractorId) === String(contractorId).trim()
    ) : true;

    ret.lineItems?.forEach((line: any) => {
      const tc = line.tempCode || '';
      if (summaryMap[tc]) {
        const qty = line.quantity || 0;
        summaryMap[tc].allContractorsReturnQty += qty;
        if (isThisContractor) {
          summaryMap[tc].contractorsReturnQty += qty;
        }
      }
    });
  });

  // Calculate WIP Consumed
  wipRecords.forEach((record: any) => {
    record.items?.forEach((item: any) => {
      const tc = item.tempCode || '';
      if (summaryMap[tc]) {
        summaryMap[tc].wipConsumed += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
      }
    });
  });

  // Calculate JMC Done
  jmcRecords.forEach((record: any) => {
    record.items?.forEach((item: any) => {
      const tc = item.tempCode || '';
      if (summaryMap[tc]) {
        summaryMap[tc].jmcDone += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
      }
    });
  });

  // Derived fields for contractors
  Object.values(summaryMap).forEach((sm: any) => {
    sm.contractorsActualIssued = sm.contractorsIssuedQty - sm.contractorsReturnQty;
    sm.allContractorsActualIssued = sm.allContractorsIssuedQty - sm.allContractorsReturnQty;
  });

  // Calculate Transfers
  transfers.forEach(transfer => {
    transfer.items?.forEach(item => {
      const tc = item.tempCode || '';
      if (summaryMap[tc]) {
        const rcvQty = item.receivedQty || 0;
        const cFilterLower = circleFilter ? circleFilter.toLowerCase() : '';
        const toStoreLower = transfer.toStore ? transfer.toStore.toLowerCase() : '';
        const fromStoreLower = transfer.fromStore ? transfer.fromStore.toLowerCase() : '';
        
        if (circleFilter && toStoreLower === cFilterLower) {
          summaryMap[tc].receivedFromOtherStore += rcvQty;
          summaryMap[tc].totalInStockAfterReceive = summaryMap[tc].acceptedQty + summaryMap[tc].receivedFromOtherStore;
        }

        if (circleFilter && fromStoreLower === cFilterLower) {
          summaryMap[tc].transferToOtherStore += rcvQty;
        }
      }
    });
  });

  // Final Balance Calculation & format output
  let result = Object.values(summaryMap).map((row: any, index) => {
    row.sr = index + 1;
    row.totalBalanceQty = row.totalInStockAfterReceive - row.transferToOtherStore - row.allContractorsActualIssued;
    row.allActivities = Array.from(row.allActivities || []);
    row.allLoaSrs = Array.from(row.allLoaSrs || []);
    return row;
  });

  if (result.length === 0) {
    // Inject Mock Data
    result = [
      {
        itemId: 'mock_1',
        sr: 1,
        hsnCode: '8544',
        description: 'Mock: Copper Cable 25mm sq',
        unit: 'Meters',
        challanQty: 1000,
        receivedQty: 1000,
        rejectedQty: 10,
        acceptedQty: 990,
        receivedFromOtherStore: 0,
        totalInStockAfterReceive: 990,
        transferToOtherStore: 50,
        contractorsIssuedQty: 200,
        contractorsReturnQty: 10,
        contractorsActualIssued: 190,
        totalBalanceQty: 750,
        remarks: 'Sample Mock Data',
        activity: 'Installation of 11kV line'
      },
      {
        itemId: 'mock_2',
        sr: 2,
        hsnCode: '8536',
        description: 'Mock: 11kV Isolator Switch',
        unit: 'Nos',
        challanQty: 15,
        receivedQty: 15,
        rejectedQty: 0,
        acceptedQty: 15,
        receivedFromOtherStore: 5,
        totalInStockAfterReceive: 20,
        transferToOtherStore: 0,
        contractorsIssuedQty: 8,
        contractorsReturnQty: 0,
        contractorsActualIssued: 8,
        totalBalanceQty: 12,
        remarks: 'Site Alpha',
        activity: 'Installation of 11kV line'
      }
    ];
  }

  return result;
}

export const createStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transferData = req.body;
  transferData.requestedBy = (req as any).user?._id;
  
  const transfer = await StoreTransfer.create(transferData);
  res.status(201).json(new ApiResponse(201, transfer, 'Transfer request created successfully'));
});

export const getStoreTransfers = asyncHandler(async (req: Request, res: Response) => {
  const { circle, registerType } = req.query;
  const user = (req as any).user;
  
  let filter: any = {};

  const storeNameRaw = circle || (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*') ? user.assignedCircle : '');
  const cleanStoreName = storeNameRaw ? String(storeNameRaw).replace(/store/i, '').trim() : '';
  const expandedStoreNames = expandCircle(cleanStoreName) || [cleanStoreName];
  if (cleanStoreName) {

    // Allow optional trailing " store" or " circle" (case-insensitive) to handle variations from bulk imports
    const storeRegex = new RegExp(`^(${expandedStoreNames.join('|')})(\\s+(store|circle))?$`, 'i');

    

    if (registerType === 'OUTWARD') {
      filter.fromStore = storeRegex;
      filter.registerType = 'OUTWARD';
    } else if (registerType === 'INWARD') {
      filter.toStore = storeRegex;
      filter.registerType = 'INWARD';
    } else {
      filter.$or = [{ fromStore: storeRegex }, { toStore: storeRegex }];
    }
  } else {
    if (registerType) {
      filter.registerType = registerType;
    }
  }

  const transfers = await StoreTransfer.find(filter)
    .populate('requestedBy', 'firstName lastName email')
    .populate('items.itemId')
    .sort({ createdAt: 1 })
    .lean();

  const formattedTransfers = transfers.map((t: any) => {
    const circle = t.fromStore || t.toStore || cleanStoreName || 'Nahan';
    const cStr = circle.toLowerCase().replace(/store|circle/gi, '').trim();

    t.items = (t.items || []).map((item: any) => {
      const itemDynamic = item.itemId?.dynamicData || {};
      
      if (!item.loaSerialNo || item.loaSerialNo === '-' || item.loaSerialNo === '') {
        item.loaSerialNo = itemDynamic.sku || itemDynamic.loaSerialNo || itemDynamic.loaSrNo || itemDynamic.srNo || itemDynamic['LOA Serial No'] || itemDynamic['LOA Sr. No.'] || '-';
      }

      if (item.loaQty === undefined || item.loaQty === null || item.loaQty === '-') {
        if (cStr && itemDynamic[`${cStr}LoaQuantity`]) {
          item.loaQty = Number(itemDynamic[`${cStr}LoaQuantity`]);
        } else if (itemDynamic.loaQuantity !== undefined && itemDynamic.loaQuantity !== '') {
          item.loaQty = Number(itemDynamic.loaQuantity);
        } else if (itemDynamic.nahanLoaQuantity) {
          item.loaQty = Number(itemDynamic.nahanLoaQuantity);
        } else if (itemDynamic.solanLoaQuantity) {
          item.loaQty = Number(itemDynamic.solanLoaQuantity);
        } else if (itemDynamic.rampurLoaQuantity) {
          item.loaQty = Number(itemDynamic.rampurLoaQuantity);
        } else if (itemDynamic.rohruLoaQuantity) {
          item.loaQty = Number(itemDynamic.rohruLoaQuantity);
        } else if (itemDynamic.circleLoaQuantity) {
          item.loaQty = Number(itemDynamic.circleLoaQuantity);
        }
      }

      return item;
    });

    return t;
  });

  res.status(200).json(new ApiResponse(200, formattedTransfers, 'Transfers fetched successfully'));
});

export const getStoreTransferById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const transfer = await StoreTransfer.findById(id).populate('requestedBy', 'firstName lastName email');
  if (!transfer) throw new ApiError(404, 'Transfer not found');
  res.status(200).json(new ApiResponse(200, transfer, 'Transfer fetched successfully'));
});

export const updateStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role?.name === "Admin" || user?.role?.name === "Super Admin" || user?.role?.permissions?.includes("*");
  const payload = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StoreTransfer.findById(id).session(session);
    if (!transfer) {
      throw new ApiError(404, 'Transfer not found');
    }

    if (transfer.status !== 'PENDING') {
      if (!isAdmin) {
        throw new ApiError(403, 'Only Admins can edit transfers that have already been dispatched or received.');
      }
    } else {
      if (!isAdmin && user.assignedCircle && user.assignedCircle !== transfer.fromStore) {
        throw new ApiError(403, 'You can only edit transfers originating from your assigned store.');
      }
    }

    Object.assign(transfer, payload);
    const updated = await transfer.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json(new ApiResponse(200, updated, 'Transfer updated successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const deleteStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role?.name === "Admin" || user?.role?.name === "Super Admin" || user?.role?.permissions?.includes("*");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StoreTransfer.findById(id).session(session);
    if (!transfer) {
      throw new ApiError(404, 'Transfer not found');
    }

    if (transfer.status !== 'PENDING') {
      if (!isAdmin) {
        throw new ApiError(403, 'Only Admins can delete transfers that have already been dispatched or received.');
      }
    } else {
      if (!isAdmin && user.assignedCircle && user.assignedCircle !== transfer.fromStore) {
        throw new ApiError(403, 'You can only delete transfers originating from your assigned store.');
      }
    }

    await StoreTransfer.findByIdAndDelete(id).session(session);
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json(new ApiResponse(200, null, 'Transfer deleted successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const updateStoreTransferStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const transfer = await StoreTransfer.findByIdAndUpdate(id, { status }, { new: true });
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  res.status(200).json(new ApiResponse(200, transfer, 'Transfer status updated successfully'));
});

export const dispatchStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const dispatchData = req.body;

  dispatchData.status = 'IN_TRANSIT';

  const transfer = await StoreTransfer.findByIdAndUpdate(id, dispatchData, { new: true });
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  res.status(200).json(new ApiResponse(200, transfer, 'Transfer dispatched successfully'));
});

export const receiveStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Expected updateData includes `items` (with receivedQty)
  updateData.status = 'RECEIVED';

  const transfer = await StoreTransfer.findByIdAndUpdate(id, updateData, { new: true });
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  res.status(200).json(new ApiResponse(200, transfer, 'Transfer received successfully'));
});
// Get all inward entries for a given purchaseInvoiceId — scoped by circle + package for Store Managers
// Bulk update all inward entries (Bulk GRN submission) — with circle + package ownership validation

export async function processInwardStockUpdate(entryId: string) {
  const entry = await StoreInwardEntry.findById(entryId);
  if (!entry) return;
  
  if (entry.itemId && entry.invoiceQty) {
    try {
      const item = await Item.findById(entry.itemId);
      if (item) {
        const qtyToAdd = Number(entry.invoiceQty || 0);
        const currentStock = Number(item.dynamicData?.stock || 0);
        
        let locations = item.dynamicData?.stockLocations || [];
        const circle = entry.circle || 'Default';
        const pkg = entry.package || 'Default';
        let locIndex = locations.findIndex((l: any) => l.circle === circle && l.package === pkg);
        if (locIndex >= 0) {
          locations[locIndex].quantity = Number(locations[locIndex].quantity || 0) + qtyToAdd;
        } else {
          locations.push({ circle, package: pkg, quantity: qtyToAdd });
        }

        let history = item.dynamicData?.purchaseHistory || [];
        history.push({
          date: entry.receivedDate || entry.createdAt || new Date(),
          vendorName: entry.vendorName || 'Unknown Vendor',
          poNumber: entry.poNumber || '-',
          quantity: qtyToAdd,
          rate: entry.rate || 0,
        });


        item.dynamicData = {
          ...item.dynamicData,
          stock: currentStock + qtyToAdd,
          stockLocations: locations,
          purchaseHistory: history,
          ...(entry.tempCode && { tempCode: entry.tempCode }),
          ...(entry.serialNumber && { loaSerialNo: entry.serialNumber }),
          ...(entry.hsnCode && { hsnCode: entry.hsnCode }),
          ...(entry.itemDescription && { description: entry.itemDescription })
        };
        item.markModified('dynamicData');
        await item.save();
        
        // Rebuild ItemSummary as item quantity was updated
        SummaryService.rebuildForItem(item._id.toString()).catch(console.error);
      }
      if (entry.purchaseInvoiceId) {
        const invoice = await PurchaseInvoice.findById(entry.purchaseInvoiceId);
        if (invoice && invoice.receiptStatus !== 'Received') {
          invoice.receiptStatus = 'Received';
          await invoice.save();
        }
      }
    } catch (err) {
      console.error('Failed to update inventory stock on inward processing:', err);
    }
    return;
  }

  if (!entry.purchaseInvoiceId) return;
  if (entry.status !== 'Submitted' && entry.status !== 'Verified') return;
  
  try {
    const invoice = await PurchaseInvoice.findById(entry.purchaseInvoiceId);
    if (invoice && invoice.receiptStatus !== 'Received') {
      invoice.receiptStatus = 'Received';
      await invoice.save();
      if (invoice.lineItems && invoice.lineItems.length > 0) {
        for (const lineItem of invoice.lineItems) {
          if (lineItem.itemId) {
            const item = await Item.findById(lineItem.itemId);
            if (item) {
              const qtyToAdd = Number(lineItem.quantity || 0);
              const currentStock = Number(item.dynamicData?.stock || 0);
              
              let locations = item.dynamicData?.stockLocations || [];
              const circle = entry.circle || invoice.circle || 'Default';
              const pkg = entry.package || invoice.package || 'Default';
              let locIndex = locations.findIndex((l: any) => l.circle === circle && l.package === pkg);
              if (locIndex >= 0) {
                locations[locIndex].quantity = Number(locations[locIndex].quantity || 0) + qtyToAdd;
              } else {
                locations.push({ circle, package: pkg, quantity: qtyToAdd });
              }

              let history = item.dynamicData?.purchaseHistory || [];
              history.push({
                date: entry.receivedDate || entry.createdAt || new Date(),
                vendorName: entry.vendorName || invoice.vendorName || 'Unknown Vendor',
                poNumber: entry.poNumber || invoice.poNumber || '-',
                quantity: qtyToAdd,
                rate: lineItem.rate || 0,
              });

              item.dynamicData = {
                ...item.dynamicData,
                stock: currentStock + qtyToAdd,
                stockLocations: locations,
                purchaseHistory: history,
                ...(lineItem.tempCode && { tempCode: lineItem.tempCode }),
                ...(lineItem.loaSerialNo && { loaSerialNo: lineItem.loaSerialNo }),
                ...(lineItem.hsnCode && { hsnCode: lineItem.hsnCode }),
                ...(lineItem.itemDescription && { description: lineItem.itemDescription })
              };
              item.markModified('dynamicData');
              await item.save();
              
              // Rebuild ItemSummary as item quantity was updated
              SummaryService.rebuildForItem(item._id.toString()).catch(console.error);
            }
          }
        }
      }
    }
} catch (err) {
    console.error('Failed to update inventory stock on inward processing:', err);
  }
}

export async function reverseInwardStockUpdate(entryId: string) {
  const entry = await StoreInwardEntry.findById(entryId);
  if (!entry) return;
  
  if (entry.itemId && entry.invoiceQty) {
    try {
      const item = await Item.findById(entry.itemId);
      if (item) {
        const qtyToSubtract = Number(entry.invoiceQty || 0);
        const currentStock = Number(item.dynamicData?.stock || 0);
        
        let locations = item.dynamicData?.stockLocations || [];
        const circle = entry.circle || 'Default';
        const pkg = entry.package || 'Default';
        let locIndex = locations.findIndex((l: any) => l.circle === circle && l.package === pkg);
        if (locIndex >= 0) {
          locations[locIndex].quantity = Math.max(0, Number(locations[locIndex].quantity || 0) - qtyToSubtract);
        }

        let history = item.dynamicData?.purchaseHistory || [];
        // Find the index of the matching history entry
        const historyIndex = history.findIndex((h: any) => 
          h.vendorName === (entry.vendorName || 'Unknown Vendor') &&
          h.poNumber === (entry.poNumber || '-') &&
          Number(h.quantity) === qtyToSubtract
        );
        
        if (historyIndex >= 0) {
          history.splice(historyIndex, 1);
        }


        item.dynamicData = {
          ...item.dynamicData,
          stock: Math.max(0, currentStock - qtyToSubtract),
          stockLocations: locations,
          purchaseHistory: history
        };
        item.markModified('dynamicData');
        await item.save();
        
        SummaryService.rebuildForItem(item._id.toString()).catch(console.error);
      }
    } catch (err) {
      console.error('Failed to reverse inventory stock on inward processing:', err);
    }
  }

  // Handle the other branch (invoice lineItems)
  if (!entry.purchaseInvoiceId) return;
  
  try {
    const invoice = await PurchaseInvoice.findById(entry.purchaseInvoiceId);
    if (invoice && invoice.lineItems && invoice.lineItems.length > 0) {
      for (const lineItem of invoice.lineItems) {
        if (lineItem.itemId) {
          const item = await Item.findById(lineItem.itemId);
          if (item) {
            const qtyToSubtract = Number(lineItem.quantity || 0);
            const currentStock = Number(item.dynamicData?.stock || 0);
            
            let locations = item.dynamicData?.stockLocations || [];
            const circle = entry.circle || invoice.circle || 'Default';
            const pkg = entry.package || invoice.package || 'Default';
            let locIndex = locations.findIndex((l: any) => l.circle === circle && l.package === pkg);
            if (locIndex >= 0) {
              locations[locIndex].quantity = Math.max(0, Number(locations[locIndex].quantity || 0) - qtyToSubtract);
            }

            let history = item.dynamicData?.purchaseHistory || [];
            const historyIndex = history.findIndex((h: any) => 
              h.vendorName === (entry.vendorName || invoice.vendorName || 'Unknown Vendor') &&
              h.poNumber === (entry.poNumber || invoice.poNumber || '-') &&
              Number(h.quantity) === qtyToSubtract
            );
            
            if (historyIndex >= 0) {
              history.splice(historyIndex, 1);
            }


            item.dynamicData = {
              ...item.dynamicData,
              stock: Math.max(0, currentStock - qtyToSubtract),
              stockLocations: locations,
              purchaseHistory: history
            };
            item.markModified('dynamicData');
            await item.save();
            
            SummaryService.rebuildForItem(item._id.toString()).catch(console.error);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to reverse inventory stock on invoice line item processing:', err);
  }
}


const parseCsvDate = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  let d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    const parts = dateStr.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      else if (parts[2].length === 2) d = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export const importStoreTransfers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);

  const errors: string[] = [];
  let successCount = 0;
  
  // Group rows by ChallanNo or MinNo to bundle them into single StoreTransfer docs
  const transfersByDoc: Record<string, any> = {};
  const user = (req as any).user;
  const itemCache = new Map();

  for await (const row of parser) {
    try {
      const docKey = row['ChallanNo'] || row['Challan No'] || row['Challan No.'] || row['MinNo'] || row['MIN No'] || row['MIN No.'] || row['MINNo'] || '';
      if (!docKey) {
        const isEmpty = Object.values(row).every(v => !v || String(v).trim() === '');
        if (isEmpty) continue;
        errors.push(`Row missing ChallanNo or MinNo (needed to group rows)`);
        continue;
      }

      const itemName = row['ItemName'] || row['Description of Material'] || '';
      const tempCode = row['TempCode'] || row['Temp Code'] || '';
      
      if (!itemName && !tempCode) {
        errors.push(`Row missing ItemName/TempCode for Transfer ${docKey}`);
        continue;
      }

      // Find Item
      let item = null;
      const cacheKey = `${tempCode}_${itemName}`;
      if (itemCache.has(cacheKey)) {
        item = itemCache.get(cacheKey);
      } else {
        if (tempCode) {
          item = await Item.findOne({ 'dynamicData.tempCode': tempCode });
        }
        if (!item && itemName) {
          const escapedItemName = itemName.replace(new RegExp('[.*+?^${}()|\\\\[\\\\]\\\\\\\\]', 'g'), '\\$&');
          item = await Item.findOne({ 'dynamicData.description': { $regex: new RegExp(`^\\s*${escapedItemName}\\s*$`, 'i') } });
        }
        if (item) itemCache.set(cacheKey, item);
      }

      if (!item) {
         errors.push(`Item '${itemName || tempCode}' not found for Transfer ${docKey}`);
         continue;
      }

      const requestedQty = Number(row['RequestedQty'] || row['Transfer Qty'] || row['TransferQty'] || 0);
      const dispatchedQty = Number(row['DispatchedQty'] || row['Transfer Qty'] || row['TransferQty'] || requestedQty);
      const receivedQty = Number(row['ReceivedQty'] || dispatchedQty);

      if (dispatchedQty < 0) {
        errors.push(`Row has negative Transfer Qty for Transfer ${docKey}`);
        continue;
      }

      const itemDynamic = item?.dynamicData || {};
      const masterUnit = itemDynamic.unit || itemDynamic.uom || item?.unit || item?.uom || 'Nos';
      const csvUnit = row['Unit'];
      
      if (csvUnit && String(csvUnit).trim() !== '' && String(csvUnit).trim().replace(/\.$/, '').toLowerCase() !== String(masterUnit).trim().replace(/\.$/, '').toLowerCase()) {
        errors.push(`Unit mismatch for item '${itemName || tempCode}' in Transfer ${docKey}. Expected '${masterUnit}', got '${csvUnit}'`);
        continue;
      }
      
      const unit = csvUnit && String(csvUnit).trim() !== '' ? String(csvUnit).trim() : masterUnit;
      const csvLoaSrNo = row['LOA Serial No'] || row['LOASerialNo'] || row['Loa Serial No'] || row['LoaSrNo'];
      const itemLoaSrNo = itemDynamic.sku || itemDynamic.loaSerialNo || itemDynamic.loaSrNo || itemDynamic.srNo || itemDynamic['LOA Serial No'] || itemDynamic['LOA Sr. No.'] || '';
      const loaSerialNo = (csvLoaSrNo && String(csvLoaSrNo).trim() !== '') ? String(csvLoaSrNo).trim() : (itemLoaSrNo ? String(itemLoaSrNo).trim() : '');

      const csvLoaQty = row['LOA Qty'] || row['LOA Quantity'] || row['LoaQty'];
      let loaQty: number | undefined = undefined;
      if (csvLoaQty !== undefined && csvLoaQty !== '' && !isNaN(Number(csvLoaQty))) {
        loaQty = Number(csvLoaQty);
      } else {
        const fromStr = String(row['From'] || row['FromStore'] || '').toLowerCase().replace(/store|circle/gi, '').trim();
        const toStr = String(row['To'] || row['ToStore'] || '').toLowerCase().replace(/store|circle/gi, '').trim();
        if (fromStr && itemDynamic[`${fromStr}LoaQuantity`]) {
          loaQty = Number(itemDynamic[`${fromStr}LoaQuantity`]);
        } else if (toStr && itemDynamic[`${toStr}LoaQuantity`]) {
          loaQty = Number(itemDynamic[`${toStr}LoaQuantity`]);
        } else if (itemDynamic.loaQuantity !== undefined && itemDynamic.loaQuantity !== '') {
          loaQty = Number(itemDynamic.loaQuantity);
        } else if (itemDynamic.nahanLoaQuantity) {
          loaQty = Number(itemDynamic.nahanLoaQuantity);
        } else if (itemDynamic.solanLoaQuantity) {
          loaQty = Number(itemDynamic.solanLoaQuantity);
        } else if (itemDynamic.rampurLoaQuantity) {
          loaQty = Number(itemDynamic.rampurLoaQuantity);
        } else if (itemDynamic.rohruLoaQuantity) {
          loaQty = Number(itemDynamic.rohruLoaQuantity);
        } else if (itemDynamic.circleLoaQuantity) {
          loaQty = Number(itemDynamic.circleLoaQuantity);
        } else if (itemDynamic.totalPackageLoaQty) {
          loaQty = Number(itemDynamic.totalPackageLoaQty);
        }
      }

      const lineItem = {
        itemId: item._id,
        tempCode: item.itemCode || tempCode || '',
        description: item.description || itemName || '',
        unit,
        requestedQty,
        dispatchedQty,
        receivedQty,
        loaSerialNo,
        loaQty
      };

      if (!transfersByDoc[docKey]) {
        transfersByDoc[docKey] = {
          requestDate: parseCsvDate(row['Date']) || new Date(),
          registerType: 'OUTWARD',
          status: 'IN_TRANSIT',
          fromStore: row['From'] || row['FromStore'] || 'Unknown Store',
          toStore: row['To'] || row['ToStore'] || 'Unknown Store',
          requestedBy: user ? user._id : null,
          vendorName: row['Name of Vendor'] || row['VendorName'] || '',
          
          minBookNo: row['MIN BOOK No.'] || row['MIN BOOK No'] || row['MinBookNo'] || '',
          minNo: row['MIN No.'] || row['MIN No'] || row['MinNo'] || row['MINNo'] || '',
          minDate: parseCsvDate(row['MIN Date']),
          
          challanNo: row['Challan No.'] || row['Challan No'] || row['ChallanNo'] || '',
          challanDate: parseCsvDate(row['Challan Date']),
          
          transportName: row['Transport'] || row['TransportName'] || '',
          truckNumber: row['Truck No'] || row['TruckNumber'] || '',
          grNumber: row['GR No'] || row['GrNumber'] || '',
          grDate: parseCsvDate(row['GR Date']),
          driverName: row['Driver Name'] || row['DriverName'] || '',
          driverMobile: row['Mobile No'] || row['DriverMobile'] || '',
          remarks: row['Remark'] || row['Remarks'] || '',
          
          items: []
        };
      }

      transfersByDoc[docKey].items.push(lineItem);
    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  // Pass 1: Validate for existing records before saving
  for (const docKey of Object.keys(transfersByDoc)) {
    const payload = transfersByDoc[docKey];
    const existing = await StoreTransfer.findOne({ 
       $or: [
         { challanNo: { $eq: payload.challanNo, $ne: '' } },
         { minNo: { $eq: payload.minNo, $ne: '' } }
       ],
       fromStore: payload.fromStore
    }).lean();
    
    if (existing) {
      errors.push(`Transfer ${payload.challanNo || payload.minNo} already exists in store ${payload.fromStore}. Skipping.`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row validation errors. No data was imported.')
    );
  }

  // Pass 2: Save Data
  for (const docKey of Object.keys(transfersByDoc)) {
    try {
      const payload = transfersByDoc[docKey];
      await StoreTransfer.create([payload]);
      successCount++;
    } catch (err: any) {
      console.error(`Error saving Transfer ${docKey}:`, err);
    }
  }

  // Rebuild summary cache for imported items
  const affectedItemIds = new Set<string>();
  Object.values(transfersByDoc).forEach((t: any) => {
    (t.items || []).forEach((it: any) => {
      if (it.itemId) affectedItemIds.add(it.itemId.toString());
    });
  });
  affectedItemIds.forEach(id => {
    SummaryService.rebuildForItem(id).catch(console.error);
  });

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed successfully')
  );
});

export const importReceivedStoreTransfers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);
  
  const errors: string[] = [];
  let successCount = 0;
  
  const transfersByDoc: Record<string, any> = {};
  const user = (req as any).user;
  const itemCache = new Map();

  for await (const row of parser) {
    try {
      const docKey = row['Challan No'] || row['ChallanNo'] || row['Challan No.'] || row['MIN No.'] || row['MIN No'] || row['MINNo'] || row['MinNo'] || '';
      if (!docKey) {
        const isEmpty = Object.values(row).every(v => !v || String(v).trim() === '');
        if (isEmpty) continue;
        errors.push(`Row missing Challan No or MIN No. (needed to group rows)`);
        continue;
      }

      const itemName = row['Item Name'] || row['Description of Material'] || '';
      const tempCode = row['Final Temp Code'] || '';
      
      if (!itemName && !tempCode) {
        errors.push(`Row missing Item Name/Temp Code for Transfer ${docKey}`);
        continue;
      }

      let item = null;
      const cacheKey = `${tempCode}_${itemName}`;
      if (itemCache.has(cacheKey)) {
        item = itemCache.get(cacheKey);
      } else {
        if (tempCode) {
          item = await Item.findOne({ 'dynamicData.tempCode': tempCode });
        }
        if (!item && itemName) {
          const escapedItemName = itemName.replace(new RegExp('[.*+?^${}()|\\\\[\\\\]\\\\\\\\]', 'g'), '\\$&');
          item = await Item.findOne({ 'dynamicData.description': { $regex: new RegExp(`^\\s*${escapedItemName}\\s*$`, 'i') } });
        }
        if (item) itemCache.set(cacheKey, item);
      }

      if (!item) {
         errors.push(`Item '${itemName || tempCode}' not found for Transfer ${docKey}`);
         continue;
      }

      const receivedQty = Number(row['Transfer Qty'] || row['Received Qty'] || 0);

      if (receivedQty < 0) {
        errors.push(`Row has negative Received Qty for Transfer ${docKey}`);
        continue;
      }

      const itemDynamic = item?.dynamicData || {};
      const masterUnit = itemDynamic.unit || itemDynamic.uom || item?.unit || item?.uom || 'Nos';
      const csvUnit = row['Unit'] || row['UNIT'];
      
      if (csvUnit && String(csvUnit).trim() !== '' && String(csvUnit).trim().replace(/\.$/, '').toLowerCase() !== String(masterUnit).trim().replace(/\.$/, '').toLowerCase()) {
        errors.push(`Unit mismatch for item '${itemName || tempCode}' in Transfer ${docKey}. Expected '${masterUnit}', got '${csvUnit}'`);
        continue;
      }
      
      const unit = csvUnit && String(csvUnit).trim() !== '' ? String(csvUnit).trim() : masterUnit;
      
      const csvLoaSrNo = row['LOA Serial No'] || row['LOASerialNo'] || row['Loa Serial No'] || row['LoaSrNo'];
      const itemLoaSrNo = itemDynamic.sku || itemDynamic.loaSerialNo || itemDynamic.loaSrNo || itemDynamic.srNo || itemDynamic['LOA Serial No'] || itemDynamic['LOA Sr. No.'] || '';
      const loaSerialNo = (csvLoaSrNo && String(csvLoaSrNo).trim() !== '') ? String(csvLoaSrNo).trim() : (itemLoaSrNo ? String(itemLoaSrNo).trim() : '');

      const csvLoaQty = row['LOA Qty'] || row['LOA Quantity'] || row['LoaQty'];
      let loaQty: number | undefined = undefined;
      if (csvLoaQty !== undefined && csvLoaQty !== '' && !isNaN(Number(csvLoaQty))) {
        loaQty = Number(csvLoaQty);
      } else {
        const fromStr = String(row['From'] || '').toLowerCase().replace(/store|circle/gi, '').trim();
        const toStr = String(row['To'] || '').toLowerCase().replace(/store|circle/gi, '').trim();
        if (fromStr && itemDynamic[`${fromStr}LoaQuantity`]) {
          loaQty = Number(itemDynamic[`${fromStr}LoaQuantity`]);
        } else if (toStr && itemDynamic[`${toStr}LoaQuantity`]) {
          loaQty = Number(itemDynamic[`${toStr}LoaQuantity`]);
        } else if (itemDynamic.loaQuantity !== undefined && itemDynamic.loaQuantity !== '') {
          loaQty = Number(itemDynamic.loaQuantity);
        } else if (itemDynamic.nahanLoaQuantity) {
          loaQty = Number(itemDynamic.nahanLoaQuantity);
        } else if (itemDynamic.solanLoaQuantity) {
          loaQty = Number(itemDynamic.solanLoaQuantity);
        } else if (itemDynamic.rampurLoaQuantity) {
          loaQty = Number(itemDynamic.rampurLoaQuantity);
        } else if (itemDynamic.rohruLoaQuantity) {
          loaQty = Number(itemDynamic.rohruLoaQuantity);
        } else if (itemDynamic.circleLoaQuantity) {
          loaQty = Number(itemDynamic.circleLoaQuantity);
        } else if (itemDynamic.totalPackageLoaQty) {
          loaQty = Number(itemDynamic.totalPackageLoaQty);
        }
      }

      const lineItem = {
        itemId: item._id,
        tempCode: item.itemCode || tempCode || '',
        description: item.description || itemName || '',
        unit,
        requestedQty: receivedQty,
        dispatchedQty: receivedQty,
        receivedQty,
        loaSerialNo,
        loaQty
      };

      if (!transfersByDoc[docKey]) {
        transfersByDoc[docKey] = {
          requestDate: parseCsvDate(row['Date of Received']) || new Date(),
          registerType: 'INWARD',
          status: 'RECEIVED',
          fromStore: row['From'] || 'Unknown Store',
          toStore: row['To'] || 'Unknown Store',
          requestedBy: user ? user._id : null,
          vendorName: row['Name of Vendor'] || '',
          
          minBookNo: row['MIN BOOK No.'] || row['MIN BOOK No'] || row['MinBookNo'] || '',
          minNo: row['MIN No.'] || row['MIN No'] || row['MinNo'] || row['MINNo'] || '',
          minDate: parseCsvDate(row['MIN Date']),
          
          challanNo: row['Challan No.'] || row['Challan No'] || row['ChallanNo'] || '',
          challanDate: parseCsvDate(row['Challan Date']),
          
          transportName: row['Transport'] || '',
          truckNumber: row['Truck No'] || '',
          grNumber: row['GR No'] || '',
          grDate: row['Date'] ? parseCsvDate(row['Date']) : undefined,
          driverName: row['Driver Name'] || '',
          driverMobile: row['Mobile No.'] || '',
          remarks: row['Remark'] || '',
          
          items: []
        };
      }

      transfersByDoc[docKey].items.push(lineItem);
    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  // Pass 1: Validate for existing records before saving — skip duplicates but keep errors list for data issues
  const duplicateKeys = new Set<string>();
  for (const docKey of Object.keys(transfersByDoc)) {
    const payload = transfersByDoc[docKey];
    
    const orConditions: any[] = [];
    if (payload.challanNo && payload.challanNo.trim() !== '' && payload.challanNo !== '-') {
      orConditions.push({ challanNo: payload.challanNo.trim() });
    }
    if (payload.minNo && payload.minNo.trim() !== '' && payload.minNo !== '-') {
      orConditions.push({ minNo: payload.minNo.trim() });
    }

    if (orConditions.length > 0) {
      const existing = await StoreTransfer.findOne({ 
        $or: orConditions,
        toStore: payload.toStore
      }).lean();
      if (existing) {
        duplicateKeys.add(docKey);
        errors.push(`Skipped (already exists): Transfer ${payload.challanNo || payload.minNo} in store ${payload.toStore}`);
      }
    }
  }

  // Hard-fail only if there are data errors (not just duplicate warnings)
  const hardErrors = errors.filter(e => !e.startsWith('Skipped'));
  if (hardErrors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row validation errors. No data was imported.')
    );
  }

  // Pass 2: Save Data (skip known duplicates)
  for (const docKey of Object.keys(transfersByDoc)) {
    if (duplicateKeys.has(docKey)) continue; // skip already-existing records
    try {
      const payload = transfersByDoc[docKey];
      await StoreTransfer.create([payload]);
      
      const fromStoreStr = payload.fromStore && payload.fromStore !== '-' ? payload.fromStore : '';
      const toStoreStr = payload.toStore && payload.toStore !== '-' ? payload.toStore : '';
      
      const fromCircleKey = fromStoreStr ? `${fromStoreStr.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;
      const toCircleKey = toStoreStr ? `${toStoreStr.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;

      for (const lineItem of payload.items) {
        if (lineItem.receivedQty > 0) {
          const item = await Item.findById(lineItem.itemId);
          if (item) {
            const currentFromQty = fromCircleKey ? Number(item.dynamicData?.[fromCircleKey] || 0) : 0;
            const currentToQty = toCircleKey ? Number(item.dynamicData?.[toCircleKey] || 0) : 0;
            
            const updateData: any = {};
            if (fromCircleKey) updateData[fromCircleKey] = Math.max(0, currentFromQty - lineItem.receivedQty);
            if (toCircleKey) updateData[toCircleKey] = currentToQty + lineItem.receivedQty;

            if (Object.keys(updateData).length > 0) {
              item.dynamicData = {
                ...item.dynamicData,
                ...updateData
              };
              item.markModified('dynamicData');
              await item.save();
              
              SummaryService.rebuildForItem(item._id.toString()).catch(console.error);
            }
          }
        }
      }
      
      successCount++;
    } catch (err: any) {
      console.error(`Error saving Transfer ${docKey}:`, err);
    }
  }

  const skippedCount = duplicateKeys.size;
  res.status(200).json(
    new ApiResponse(200, { successCount, skippedCount, errors }, 
      skippedCount > 0 
        ? `Import completed: ${successCount} imported, ${skippedCount} skipped (already existed).`
        : 'Import process completed successfully'
    )
  );
});

// ====== MHROV CONTROLLERS ======

// 
// NEW API: Query DI Line Items for MHROV
// 
