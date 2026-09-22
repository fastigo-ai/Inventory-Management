import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { stringify } from 'csv-stringify/sync';
import { StoreInwardEntry } from './storeInwardEntry.schema';
import { DI } from '../di/di.schema';
import { PurchaseInvoice } from '../purchases/purchaseInvoice.schema';
import Item from '../items/item.model';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { ContractorReturn } from '../contractors/contractorReturn.schema';
import { StoreTransfer } from './storeTransfer.schema';
import { Mhrov } from './mhrov.schema';
import { WipRegister } from '../wip/wip.schema';
import { JmcRegister } from '../jmc/jmc.schema';
import cloudinary from '../../core/utils/cloudinary';
import { SummaryService } from '../reports/summary/summary.service';
import { expandCircle } from '../../utils/hierarchy';
// 
// NEW API: Filter Options for MHROV DI Search
// 
export const getMhrovDIFilterOptions = asyncHandler(async (req: Request, res: Response) => {
  const { circle } = req.query;
  const filter: any = {};
  
  if (circle) {
    filter.$or = [{ circle: circle }, { 'lineItems.circle': circle }];
  }

  const [diNos, vendors] = await Promise.all([
    mongoose.model('DI').distinct('diNumber', filter),
    mongoose.model('DI').distinct('vendorName', filter)
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      diNos: diNos.filter(Boolean),
      vendors: vendors.filter(Boolean),
      invoiceNos: [] // DIs don't have invoices
    }, 'MHROV filter options fetched successfully')
  );
});


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


// ====== MHROV CONTROLLERS ======

const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

export const syncMhrovQuantities = async (diId?: string, itemId?: string, inwardEntryId?: string) => {
  if (inwardEntryId) {
    const entry = await StoreInwardEntry.findById(inwardEntryId);
    if (entry) {
      const mhrovs = await Mhrov.find({ 'items.inwardEntryId': inwardEntryId });
      let totalDone = 0;
      mhrovs.forEach(m => {
         m.items?.forEach(it => {
           if (it.inwardEntryId?.toString() === inwardEntryId.toString()) {
             totalDone += (it.mhrovDoneQty || 0);
           }
         });
      });
      
      entry.mhrovDoneQty = totalDone;
      const totalQty = Number(entry.totalQty || entry.invoiceQty || entry.challanQty || 0);
      entry.pendingMhrovQty = Math.max(0, totalQty - totalDone);
      
      if (totalDone === 0) entry.mhrovStatus = 'PENDING';
      else if (entry.pendingMhrovQty <= 0) entry.mhrovStatus = 'COMPLETED';
      else entry.mhrovStatus = 'PARTIAL';
      
      await entry.save();
    }
  }
  
  if (diId && itemId) {
    const di = await DI.findById(diId);
    if (di) {
      const mhrovs = await Mhrov.find({ 'items.diId': diId, 'items.itemId': itemId });
      let totalDone = 0;
      mhrovs.forEach(m => {
         m.items?.forEach(it => {
           if (it.diId?.toString() === diId.toString() && it.itemId?.toString() === itemId.toString()) {
             totalDone += (it.mhrovDoneQty || 0);
           }
         });
      });
      
      let updated = false;
      let remainingToApply = totalDone;
      
      const matchingItems = di.lineItems.filter((li: any) => li.itemId?.toString() === itemId.toString());
      
      matchingItems.forEach((li: any, index: number) => {
        const isLast = index === matchingItems.length - 1;
        const applied = isLast ? remainingToApply : Math.min(li.quantity || 0, remainingToApply);
        
        li.mhrovDoneQty = applied;
        li.pendingMhrovQty = Math.max(0, (li.quantity || 0) - applied);
        remainingToApply = Math.max(0, remainingToApply - applied);
        
        if (applied === 0) li.mhrovStatus = 'PENDING';
        else if (li.pendingMhrovQty <= 0) li.mhrovStatus = 'COMPLETED';
        else li.mhrovStatus = 'PARTIAL';
        
        updated = true;
      });
      
      if (updated) {
        di.markModified('lineItems');
        await di.save();
      }
    }
  }
};

export const createMhrov = asyncHandler(async (req: Request, res: Response) => {
  const { mhrovNumber, mhrovDate, status, inwardEntries, items } = req.body;
  const user = (req as any).user;
  
  let parsedItems: any[] = [];
  let parsedInwardEntries: any[] = [];

  const rawItems = items || inwardEntries;
  if (rawItems) {
    let arr = rawItems;
    if (typeof rawItems === 'string') {
      try {
        arr = JSON.parse(rawItems);
      } catch (e) {
        res.status(400);
        throw new Error('Invalid JSON format for items payload');
      }
    }
    if (Array.isArray(arr)) {
      arr.forEach((it: any) => {
        if (typeof it === 'object' && it !== null) {
          const entryId = it.inwardEntryId || it._id;
          const diId = it.diId;
          const itemId = it.itemId;
          const qty = Number(it.mhrovDoneQty !== undefined ? it.mhrovDoneQty : (it.remainingQty || it.totalQty || it.invoiceQty || 0));
          
          if (diId && itemId) {
            // New DI-based items
            parsedItems.push({ diId, itemId, mhrovDoneQty: qty });
          } else if (entryId) {
            // Legacy inwardEntryId based items
            parsedInwardEntries.push(entryId);
            parsedItems.push({ inwardEntryId: entryId, mhrovDoneQty: qty });
          }
        } else {
          parsedInwardEntries.push(it);
          parsedItems.push({ inwardEntryId: it, mhrovDoneQty: 0 });
        }
      });
    }
  }

  let documentUrl = undefined;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'mhrov-documents');
    documentUrl = result.secure_url;
  }

  const mhrov = new Mhrov({
    mhrovNumber,
    mhrovDate,
    status,
    documentUrl,
    inwardEntries: parsedInwardEntries,
    items: parsedItems,
    package: user?.assignedPackage,
    circle: user?.assignedCircle,
    createdBy: user?._id
  });

  await mhrov.save();

  // Trigger sync for all associated items
  for (const it of parsedItems) {
    if (it.inwardEntryId) {
      await syncMhrovQuantities(undefined, undefined, it.inwardEntryId);
    }
    if (it.diId && it.itemId) {
      await syncMhrovQuantities(it.diId, it.itemId);
    }
  }

  res.status(201).json(new ApiResponse(201, mhrov, 'MHROV created successfully'));
});

export const getMhrovs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};
  
  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };
  }

  if (req.query.unbilled === 'true') {
    const ClientBill = mongoose.model('ClientBill');
    const billedMhrovs = await ClientBill.find({
      billType: 'Supply',
      stage: '60%',
      status: { $ne: 'Rejected' },
      referenceType: 'MHROV'
    }).select('referenceIds').lean();
    
    const usedIds = billedMhrovs.flatMap((b: any) => b.referenceIds);
    if (usedIds.length > 0) {
      filter._id = { $nin: usedIds };
    }
  }

  const mhrovs = await Mhrov.find(filter)
    .populate("inwardEntries", "invoiceNumber itemName totalQty")
    .populate("items.diId", "diNumber date lineItems")
    .populate("items.itemId")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, mhrovs, 'MHROVs fetched successfully'));
});

export const exportMhrovs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};
  
  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };
  }

  const mhrovs = await Mhrov.find(filter)
    .populate("inwardEntries")
    .populate("items.diId")
    .populate("items.itemId")
    .sort({ createdAt: 1 })
    .lean();

  const csvData = mhrovs.flatMap(m => {
    if (!m.items || m.items.length === 0) return [];
    return m.items.map(item => {
      let inwardEntry = {} as any;
      let diDoc = item.diId as any;
      let itemDoc = item.itemId as any;

      if (item.inwardEntryId) {
        inwardEntry = (m.inwardEntries as any[]).find(entry => entry._id.toString() === item.inwardEntryId!.toString()) || {} as any;
      }
      
      return {
        "MHROV No": m.mhrovNumber || '',
        "MHROV Date": m.mhrovDate ? new Date(m.mhrovDate).toISOString().split('T')[0] : '',
        "Status": m.status || '',
        "Package": m.package || '',
        "Circle": m.circle || '',
        "DI No": inwardEntry.diRefNo || diDoc?.diNumber || '',
        "Vendor Name": inwardEntry.vendorName || diDoc?.vendorName || '',
        "PI / Invoice No": inwardEntry.invoiceNumber || inwardEntry.inwardId || '',
        "PO No": inwardEntry.poNumber || diDoc?.poNumber || '',
        "Item Name": inwardEntry.itemName || itemDoc?.dynamicData?.name || itemDoc?.dynamicData?.description || itemDoc?.name || '',
        "LOA Serial No": inwardEntry.serialNumber || itemDoc?.dynamicData?.sku || itemDoc?.sku || itemDoc?.dynamicData?.loaSerialNo || '',
        "Temp Code": inwardEntry.tempCode || itemDoc?.dynamicData?.tempCode || '',
        "MHROV Done Qty": item.mhrovDoneQty || 0
      };
    });
  });

  const csvString = stringify(csvData, { header: true });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=mhrov_export.csv');
  res.status(200).send(csvString);
});

export const importMhrovs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    return;
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);

  const rows: any[] = [];
  const errors: string[] = [];
  
  for await (const r of parser) {
    const row = r as any;
    const nRow: any = {};
    for (const key of Object.keys(row)) {
      nRow[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key];
    }
    rows.push(nRow);
  }

  const safeDate = (val: any): Date => {
    if (!val) return new Date();
    const str = String(val).trim();
    const ddmmyyyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    }
    const iso = str.match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) return new Date(str.split('T')[0]);
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  };
  
  const safeNum = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const n = parseFloat(String(val).replace(/,/g, '').trim());
    return isNaN(n) ? 0 : n;
  };

  const mhrovMap: Record<string, any> = {};

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const actualRowNumber = rowIndex + 2;
    const mhrovNumber = row['mhrovno'] || row['mhrovnumber'];
    
    if (!mhrovNumber) continue;

    if (!mhrovMap[mhrovNumber]) {
      mhrovMap[mhrovNumber] = {
        mhrovNumber,
        mhrovDate: safeDate(row['mhrovdate']),
        status: row['status'] || 'Pending',
        package: row['package'] || '',
        circle: row['circle'] || '',
        items: []
      };
    }

    const itemName = row['itemname'];
    const diNo = row['dino'] || '';
    const loaSerialNo = row['loaserialno'] || row['serialno'] || '';
    const tempCode = row['tempcode'] || '';
    const invoiceNo = row['invoiceno'] || row['invoicenumber'] || '';
    const mhrovDoneQty = safeNum(row['mhrovdoneqty']);

    if (itemName && mhrovDoneQty > 0) {
      mhrovMap[mhrovNumber].items.push({
        rowNumber: actualRowNumber,
        itemName,
        diNo,
        loaSerialNo,
        tempCode,
        invoiceNo,
        mhrovDoneQty,
        circle: row['circle'] || '',
        package: row['package'] || ''
      });
    }
  }

  for (const mhrovNumber of Object.keys(mhrovMap)) {
    const mhrovData = mhrovMap[mhrovNumber];
    
    const finalItems = [];

    // Bulk fetch to prevent N+1 query problem and DB timeouts
    const cleanStr = (s: any) => String(s || '').replace(/\*+$/, '').trim();
    const cleanStrLower = (s: any) => cleanStr(s).toLowerCase();
    const normalizeForMatch = (s: any) => cleanStrLower(s).replace(/\s+/g, '');

    // Collect all possible keys, cleaned of asterisks and whitespace
    const uniqueDiNos = [...new Set(mhrovData.items.map((i: any) => cleanStr(i.diNo)).filter(Boolean))];
    
    // We use a broad $or query to catch the record if ANY of the identifiers match
    const fetchCondition: any = { $or: [] };
    // MHROV depends strictly on DI
    if (uniqueDiNos.length > 0) fetchCondition.$or.push({ diNumber: { $in: uniqueDiNos } });
    
    // Fallback if somehow there are no identifiers (rare)
    if (fetchCondition.$or.length === 0) {
        delete fetchCondition.$or;
    }
    
    let bulkEntries: any[] = [];
    if (Object.keys(fetchCondition).length > 0) {
        bulkEntries = await DI.find(fetchCondition).lean();
    }

    for (const item of mhrovData.items) {
      // Find matches in memory instead of hitting the DB sequentially
      let matchedLineItem: any = null;
      let matchedDI: any = null;

      for (const entry of bulkEntries) {
         const csvDi = cleanStrLower(item.diNo);
         const dbDi = cleanStrLower(entry.diNumber);
         if (csvDi && dbDi && dbDi !== csvDi) continue;

         if (entry.lineItems && Array.isArray(entry.lineItems)) {
             for (const li of entry.lineItems) {
                 let match = true;
                 
                 const csvCircle = normalizeForMatch(item.circle || mhrovData.circle);
                 const dbCircle = normalizeForMatch(li.circle || entry.circle);
                 if (csvCircle && dbCircle && dbCircle !== csvCircle) match = false;
                 
                 const csvSerial = normalizeForMatch(item.loaSerialNo);
                 const dbSerial = normalizeForMatch(li.loaSerialNo);
                 if (csvSerial && dbSerial && dbSerial !== csvSerial) {
                    match = false;
                 }
                 
                 const csvItem = normalizeForMatch(item.itemName);
                 const dbItem = normalizeForMatch(li.itemName);
                 if (csvItem && dbItem !== csvItem) {
                    match = false;
                 }
                 
                 const csvTemp = normalizeForMatch(item.tempCode);
                 const dbTemp = normalizeForMatch(li.tempCode);
                 if (csvTemp && dbTemp !== csvTemp) {
                    match = false;
                 }
                 
                 const csvPackage = normalizeForMatch(item.package || mhrovData.package);
                 const dbPackage = normalizeForMatch(li.package || entry.package);
                 if (csvPackage && dbPackage && dbPackage !== csvPackage) {
                    match = false;
                 }

                 if (match) {
                     matchedLineItem = li;
                     matchedDI = entry;
                     break;
                 }
             }
         }
         if (matchedLineItem) break;
      }

      if (!matchedLineItem) {
         let debugStr = '';
         if (item.loaSerialNo === '2086' && bulkEntries.length > 0) {
             const entry = bulkEntries.find((e: any) => cleanStrLower(e.diNumber) === cleanStrLower(item.diNo));
             if (!entry) debugStr = " (DI number not found in bulkEntries)";
             else debugStr = " (Line item loop failed, likely a package or item name mismatch. See terminal logs.)";
         }
         errors.push(`Row ${item.rowNumber}: Could not find DI "${item.diNo}" with Item "${item.itemName}", Serial "${item.loaSerialNo}", TempCode "${item.tempCode}"${debugStr}`);
      } else {
         finalItems.push({ 
             diId: matchedDI._id,
             itemId: matchedLineItem.itemId, 
             mhrovDoneQty: item.mhrovDoneQty 
         });
      }
    }
    mhrovData.inwardEntries = [];
    mhrovData.finalItems = finalItems;
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Import failed due to validation errors',
      data: { errors }
    });
    return;
  }

  let successCount = 0;
  for (const mhrovNumber of Object.keys(mhrovMap)) {
    const data = mhrovMap[mhrovNumber];
    await Mhrov.findOneAndUpdate(
      { mhrovNumber },
      {
        $set: {
          mhrovNumber: data.mhrovNumber,
          mhrovDate: data.mhrovDate,
          status: data.status,
          package: data.package,
          circle: data.circle,
          inwardEntries: data.inwardEntries,
          items: data.finalItems
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    
    // Sync items
    if (data.finalItems && Array.isArray(data.finalItems)) {
      for (const it of data.finalItems) {
        if (it.inwardEntryId) {
          await syncMhrovQuantities(undefined, undefined, it.inwardEntryId);
        }
        if (it.diId && it.itemId) {
          await syncMhrovQuantities(it.diId, it.itemId);
        }
      }
    }
    
    successCount++;
  }

  res.status(200).json({
    success: true,
    message: 'Import processed successfully',
    data: { successCount, errors: [] }
  });
});

export const updateMhrov = asyncHandler(async (req: Request, res: Response) => {
  const { mhrovNumber, mhrovDate, status, inwardEntries, items } = req.body;
  const mhrovId = req.params.id;

  const mhrov = await Mhrov.findById(mhrovId);
  if (!mhrov) {
    res.status(404);
    throw new Error('MHROV not found');
  }
  
  if (mhrov.status === 'Done') {
    res.status(400);
    throw new Error('Cannot edit a completed MHROV');
  }

  let parsedItems: any[] = mhrov.items || [];
  let parsedInwardEntries: any[] = mhrov.inwardEntries || [];

  const rawItems = items || inwardEntries;
  if (rawItems) {
    let arr = rawItems;
    if (typeof rawItems === 'string') {
      try {
        arr = JSON.parse(rawItems);
      } catch (e) {
        res.status(400);
        throw new Error('Invalid JSON format for items payload');
      }
    }
    if (Array.isArray(arr)) {
      parsedItems = [];
      parsedInwardEntries = [];
      arr.forEach((it: any) => {
        if (typeof it === 'object' && it !== null) {
          const entryId = it.inwardEntryId || it._id;
          const diId = it.diId;
          const itemId = it.itemId;
          const qty = Number(it.mhrovDoneQty !== undefined ? it.mhrovDoneQty : (it.remainingQty || it.totalQty || it.invoiceQty || 0));
          
          if (diId && itemId) {
            // New DI-based items
            parsedItems.push({ diId, itemId, mhrovDoneQty: qty });
          } else if (entryId) {
            parsedInwardEntries.push(entryId);
            parsedItems.push({ inwardEntryId: entryId, mhrovDoneQty: qty });
          }
        } else {
          parsedInwardEntries.push(it);
          parsedItems.push({ inwardEntryId: it, mhrovDoneQty: 0 });
        }
      });
    }
  }

  let documentUrl = mhrov.documentUrl;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'mhrov-documents');
    documentUrl = result.secure_url;
  }

  mhrov.mhrovNumber = mhrovNumber || mhrov.mhrovNumber;
  mhrov.mhrovDate = mhrovDate || mhrov.mhrovDate;
  const oldItems = [...(mhrov.items || [])];

  mhrov.status = status || mhrov.status;
  mhrov.documentUrl = documentUrl;
  mhrov.inwardEntries = parsedInwardEntries;
  mhrov.items = parsedItems;

  await mhrov.save();

  // Sync old and new items
  const allItemsToSync = [...oldItems, ...parsedItems];
  for (const it of allItemsToSync) {
    if (it.inwardEntryId) {
      await syncMhrovQuantities(undefined, undefined, it.inwardEntryId);
    }
    if (it.diId && it.itemId) {
      await syncMhrovQuantities(it.diId, it.itemId);
    }
  }

  res.status(200).json(new ApiResponse(200, mhrov, 'MHROV updated successfully'));
});

export const getMhrovById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { circle } = req.query;
  const mhrov = await Mhrov.findById(id).populate({
    path: 'inwardEntries',
    populate: [
      { path: 'diId' },
      { path: 'itemId' }
    ]
  }).populate({
    path: 'items.diId'
  }).populate({
    path: 'items.itemId'
  }).lean();

  if (!mhrov) {
    throw new ApiError(404, 'MHROV not found');
  }

  const itemsMap = new Map<string, number>();
  if (mhrov.items && Array.isArray(mhrov.items)) {
    mhrov.items.forEach((it: any) => {
      if (it.inwardEntryId) {
        itemsMap.set(it.inwardEntryId.toString(), it.mhrovDoneQty);
      }
    });
  }

  const populatedEntries = (mhrov.inwardEntries || []).map((entry: any) => {
    if (entry && entry._id) {
      const idStr = entry._id.toString();
      const targetCircle = (circle as string) || entry.circle;
      
      let diQty = 0;
      if (entry.diId && (entry.diId as any).lineItems && Array.isArray((entry.diId as any).lineItems)) {
        const lineItem = (entry.diId as any).lineItems.find((li: any) => {
          const isItemMatch = li.itemId?.toString() === entry.itemId?.toString() || li.itemName === entry.itemName;
          const liCircle = li.circle || (entry.diId as any).circle;
          const liPackage = li.package || (entry.diId as any).package;
          const isCircleMatch = !liCircle || !targetCircle || liCircle.toLowerCase() === targetCircle.toLowerCase();
          const isPackageMatch = !liPackage || !entry.package || liPackage.toLowerCase() === entry.package.toLowerCase();
          return isItemMatch && isCircleMatch && isPackageMatch;
        });
        if (lineItem) {
          diQty = Number(lineItem.quantity || 0);
        }
      }
      const entryTotalQty = diQty > 0 ? diQty : Number(entry.totalQty || entry.invoiceQty || 0);
      const doneQty = itemsMap.has(idStr) ? itemsMap.get(idStr) : entryTotalQty;
      
      let loaSrNo = '';
      let tempCode = '';
      let totalLoaQty = 0;
      let circleLoaQty = 0;
      let balanceInStock = 0;
      
      if (entry.itemId && (entry.itemId as any).dynamicData) {
        const dd = (entry.itemId as any).dynamicData;
        loaSrNo = dd.loaSrNo || dd.loaSerialNo || dd.sku || '';
        tempCode = dd.tempCode || '';
        totalLoaQty = Number(dd.loaQty || dd.loaQuantity || dd.totalLoaQuantity || dd.qty || dd.quantity || 0);
        
        
        const circleKey = targetCircle ? targetCircle.toLowerCase() + 'LoaQuantity' : '';
        if (circleKey && dd[circleKey]) {
          circleLoaQty = Number(dd[circleKey]);
        }
        
        if (dd.stockLocations && Array.isArray(dd.stockLocations) && targetCircle) {
          const matchingLoc = dd.stockLocations.find((l: any) => 
            l.circle?.toLowerCase() === targetCircle.toLowerCase() &&
            (!entry.package || l.package?.toLowerCase() === entry.package?.toLowerCase())
          );
          if (matchingLoc) {
             balanceInStock = Number(matchingLoc.quantity || 0);
          } else {
             const matchingCircles = dd.stockLocations.filter((l: any) => l.circle?.toLowerCase() === targetCircle.toLowerCase());
             balanceInStock = matchingCircles.reduce((sum: number, l: any) => sum + Number(l.quantity || 0), 0);
          }
        }
      }
      
      return {
        ...entry,
        mhrovDoneQty: doneQty,
        loaSrNo,
        tempCode,
        totalLoaQty,
        circleLoaQty,
        balanceInStock
      };
    }
    return entry;
  });

  // If there are no inwardEntries (because of the new DI-only import), construct them from items array
  if (populatedEntries.length === 0 && mhrov.items && mhrov.items.length > 0) {
      mhrov.items.forEach((it: any, index: number) => {
          if (it.diId && it.itemId) {
              const di = it.diId;
              const item = it.itemId;
              
              const targetCircle = (circle as string) || di.circle || mhrov.circle;
              
              let loaSrNo = '';
              let tempCode = '';
              let totalLoaQty = 0;
              let circleLoaQty = 0;
              let balanceInStock = 0;
              
              if (item.dynamicData) {
                  const dd = item.dynamicData;
                  loaSrNo = dd.loaSrNo || dd.loaSerialNo || dd.sku || '';
                  tempCode = dd.tempCode || '';
                  totalLoaQty = Number(dd.loaQty || dd.loaQuantity || dd.totalLoaQuantity || dd.qty || dd.quantity || 0);
                  
                  const circleKey = targetCircle ? targetCircle.toLowerCase() + 'LoaQuantity' : '';
                  if (circleKey && dd[circleKey]) {
                    circleLoaQty = Number(dd[circleKey]);
                  }
                  
                  if (dd.stockLocations && Array.isArray(dd.stockLocations) && targetCircle) {
                    const matchingLoc = dd.stockLocations.find((l: any) => 
                      l.circle?.toLowerCase() === targetCircle.toLowerCase() &&
                      (!di.package || l.package?.toLowerCase() === di.package?.toLowerCase())
                    );
                    if (matchingLoc) {
                       balanceInStock = Number(matchingLoc.quantity || 0);
                    } else {
                       const matchingCircles = dd.stockLocations.filter((l: any) => l.circle?.toLowerCase() === targetCircle.toLowerCase());
                       balanceInStock = matchingCircles.reduce((sum: number, l: any) => sum + Number(l.quantity || 0), 0);
                    }
                  }
              }

              let diQty = 0;
              if (di.lineItems && Array.isArray(di.lineItems)) {
                  const lineItem = di.lineItems.find((li: any) => 
                      li.itemId?.toString() === item._id.toString()
                  );
                  if (lineItem) {
                      diQty = Number(lineItem.quantity || 0);
                      // override tempcode/serial if provided in lineitem
                      if (lineItem.tempCode) tempCode = lineItem.tempCode;
                      if (lineItem.loaSerialNo) loaSrNo = lineItem.loaSerialNo;
                  }
              }

              populatedEntries.push({
                  _id: `synthetic-${index}`,
                  invoiceNumber: 'N/A (DI Only)',
                  diRefNo: di.diNumber,
                  itemName: item.dynamicData?.name || item.dynamicData?.itemName || item.dynamicData?.itemDescription || 'Unknown Item',
                  totalQty: diQty,
                  diId: di,
                  itemId: item,
                  circle: targetCircle,
                  package: di.package,
                  mhrovDoneQty: it.mhrovDoneQty,
                  loaSrNo,
                  tempCode,
                  totalLoaQty,
                  circleLoaQty,
                  balanceInStock
              });
          }
      });
  }

  res.status(200).json(new ApiResponse(200, {
    ...mhrov,
    inwardEntries: populatedEntries
  }, 'MHROV fetched successfully'));
});


export const getMhrovDashboardData = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = { status: { $in: ['Verified', 'Approved'] } };
  const mhrovFilter: any = {};
  
  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
    if (user.assignedPackage && user.assignedPackage.trim()) {
      filter.package = user.assignedPackage;
      mhrovFilter.package = user.assignedPackage;
    }
    if (user.assignedCircle) {
      const exp = expandCircle(user.assignedCircle) || [user.assignedCircle];
      filter.circle = { $in: exp };
      mhrovFilter.circle = { $in: exp };
    }
  }

  // 1. Fetch all VERIFIED Inward Entries
  const inwardEntries = await StoreInwardEntry.find(filter)
    .populate('diId', 'diNumber lineItems')
    .sort({ createdAt: 1 })
    .lean();

  // 2. Fetch all MHROVs to cross-reference
  const mhrovs = await Mhrov.find(mhrovFilter).lean();

  // 3. Create a map of inwardEntryId -> mhrov details
  const inwardToMhrovMap = new Map<string, any>();
  mhrovs.forEach(mhrov => {
    if (mhrov.inwardEntries && Array.isArray(mhrov.inwardEntries)) {
      mhrov.inwardEntries.forEach(entryId => {
        inwardToMhrovMap.set(entryId.toString(), {
          mhrovId: mhrov._id,
          mhrovNumber: mhrov.mhrovNumber,
          mhrovDate: mhrov.mhrovDate,
          status: mhrov.status
        });
      });
    }
    if (mhrov.items && Array.isArray(mhrov.items)) {
      mhrov.items.forEach((item: any) => {
        const data = {
          mhrovId: mhrov._id,
          mhrovNumber: mhrov.mhrovNumber,
          mhrovDate: mhrov.mhrovDate,
          status: mhrov.status
        };
        if (item.inwardEntryId) {
          inwardToMhrovMap.set(item.inwardEntryId.toString(), data);
        }
        if (item.diId && item.itemId) {
          const diIdStr = item.diId._id ? item.diId._id.toString() : item.diId.toString();
          const itemIdStr = item.itemId._id ? item.itemId._id.toString() : item.itemId.toString();
          inwardToMhrovMap.set(`${diIdStr}_${itemIdStr}`, data);
        }
        if (item.itemId) {
          const itemIdStr = item.itemId._id ? item.itemId._id.toString() : item.itemId.toString();
          inwardToMhrovMap.set(`ITEM_${itemIdStr}`, data);
        }
      });
    }
  });

  // 4. Merge data and calculate metrics
  let totalItems = 0;
  let doneCount = 0;
  let pendingCount = 0;
  let doneNotSignedCount = 0;
  let notStartedCount = 0;

  const mergedItems = inwardEntries.map(entry => {
    totalItems++;
    let mhrovData = inwardToMhrovMap.get(entry._id.toString());
    if (!mhrovData && entry.diId && entry.itemId) {
      const diIdStr = (entry.diId as any)._id ? (entry.diId as any)._id.toString() : entry.diId.toString();
      const itemIdStr = (entry.itemId as any)._id ? (entry.itemId as any)._id.toString() : entry.itemId.toString();
      mhrovData = inwardToMhrovMap.get(`${diIdStr}_${itemIdStr}`);
    }
    if (!mhrovData && entry.itemId) {
      const itemIdStr = (entry.itemId as any)._id ? (entry.itemId as any)._id.toString() : entry.itemId.toString();
      mhrovData = inwardToMhrovMap.get(`ITEM_${itemIdStr}`);
    }
    
    if (mhrovData) {
      if (mhrovData.status?.toUpperCase() === 'DONE' || mhrovData.status?.toUpperCase() === 'Verified') doneCount++;
      else if (mhrovData.status?.toUpperCase() === 'PENDING') pendingCount++;
      else if (mhrovData.status === 'Pending Signature') doneNotSignedCount++;
      else pendingCount++; // Fallback
      
      return { ...entry, mhrovData };
    } else {
      notStartedCount++;
      return { ...entry, mhrovData: { status: 'NOT STARTED' } };
    }
  });

  const metrics = {
    totalItems,
    doneCount,
    pendingCount,
    doneNotSignedCount,
    notStartedCount
  };

  res.status(200).json(new ApiResponse(200, { metrics, items: mergedItems }, 'Dashboard data fetched successfully'));
});
// 
// NEW API: Query DI Line Items for MHROV
// 
export const queryDILineItemsForMhrov = asyncHandler(async (req: Request, res: Response) => {
  const { diId, diNo, vendor, itemName, page = 1, limit = 50, excludeMhrovId, circle } = req.query;
  const filter: any = {};
  
  if (diId) filter._id = diId;
  if (diNo && diNo !== 'all') filter.diNumber = diNo;
  if (vendor && vendor !== 'all') filter.vendorName = vendor;
  if (circle) filter.$or = [{ circle: circle }, { 'lineItems.circle': circle }];
  
  // Find matching DIs
  const dis = await mongoose.model('DI').find(filter).lean();
  
  // If excluding an MHROV (edit mode), get its items to add back to remaining quantity
  const editMhrovItemsMap = new Map<string, number>();
  if (excludeMhrovId) {
    const editMhrov = await Mhrov.findById(excludeMhrovId).lean();
    if (editMhrov) {
      (editMhrov.items || []).forEach((item: any) => {
        if (item.diId && item.itemId) {
           const key = `${item.diId}_${item.itemId}`;
           editMhrovItemsMap.set(key, (editMhrovItemsMap.get(key) || 0) + Number(item.mhrovDoneQty || 0));
        }
      });
    }
  }

  // Extract all relevant line items
  let lineItemsWithStock: any[] = [];
  const uniqueItemIds = new Set<string>();
  
  for (const di of dis) {
    const activeCircle = (circle as string) || (di as any).circle;
    
    let liIndex = 0;
    for (const li of (di as any).lineItems || []) {
      liIndex++;
      // Filter by item name if provided
      if (itemName && !li.itemName.toLowerCase().includes((itemName as string).toLowerCase())) {
        continue;
      }
      // Filter by circle if provided (either DI level or Line Item level)
      if (circle) {
        const liCircle = li.circle || (di as any).circle;
        if (liCircle && liCircle.toLowerCase() !== (circle as string).toLowerCase()) {
          continue;
        }
      }
      
      const itemIdStr = li.itemId?.toString();
      const diIdStr = (di as any)._id.toString();
      const key = `${diIdStr}_${itemIdStr}_${liIndex}`;
      const lookupKey = `${diIdStr}_${itemIdStr}`;
      let editModeAllocatedQty = editMhrovItemsMap.get(lookupKey) || 0;
      
      const totalQty = Number(li.quantity || 0);
      let doneQty = li.mhrovDoneQty || 0;
      let remainingQty = li.pendingMhrovQty !== undefined ? li.pendingMhrovQty : Math.max(0, totalQty - doneQty);
      
      // If we are in edit mode, add back the quantity that this specific MHROV had claimed
      remainingQty += editModeAllocatedQty;
      doneQty = Math.max(0, doneQty - editModeAllocatedQty);
      
      // Prevent double-adding for duplicate items in same DI
      if (editModeAllocatedQty > 0) {
         editMhrovItemsMap.set(lookupKey, 0);
      }
      
      if (remainingQty <= 0) continue; // Skip exhausted items
      
      if (li.itemId) {
        uniqueItemIds.add(li.itemId.toString());
      }
      
      lineItemsWithStock.push({
        _id: key, // Use composite key for frontend selection
        diId: {
          _id: diIdStr,
          diNumber: (di as any).diNumber
        },
        diRefNo: (di as any).diNumber,
        vendorName: (di as any).vendorName || "N/A",
        invoiceNumber: "N/A", // DIs don't have this
        invoiceDate: (di as any).date,
        itemName: li.itemName,
        itemIdStr,
        loaSrNo: li.loaSerialNo || '',
        tempCode: li.tempCode || '',
        totalQty,
        remainingQty,
        doneQty,
        activeCircle,
        package: li.package || (di as any).package,
        diLineItem: li // Keep raw line item for reference
      });
    }
  }

  // Bulk fetch items
  const items = await mongoose.model('Item').find({ _id: { $in: Array.from(uniqueItemIds) } }).lean();
  const itemsMap = new Map();
  items.forEach((i: any) => itemsMap.set(i._id.toString(), i));

  // Populate item details
  lineItemsWithStock = lineItemsWithStock.map(li => {
    let loaSrNo = li.loaSrNo;
    let tempCode = li.tempCode;
    let totalLoaQty = 0;
    let circleLoaQty = 0;
    let balanceInStock = 0;
    
    if (li.itemIdStr) {
      const itemMaster = itemsMap.get(li.itemIdStr);
      if (itemMaster && itemMaster.dynamicData) {
        const dd = itemMaster.dynamicData;
        loaSrNo = loaSrNo || dd.loaSrNo || dd.loaSerialNo || dd.sku || '';
        tempCode = tempCode || dd.tempCode || '';
        totalLoaQty = Number(dd.loaQty || dd.loaQuantity || dd.totalLoaQuantity || dd.qty || dd.quantity || 0);
        
        if (li.activeCircle) {
          const circleKey = li.activeCircle.toLowerCase() + 'LoaQuantity';
          if (dd[circleKey]) {
            circleLoaQty = Number(dd[circleKey]);
          }
          
          if (dd.stockLocations && Array.isArray(dd.stockLocations)) {
            const matchingLoc = dd.stockLocations.find((l: any) => 
              l.circle?.toLowerCase() === li.activeCircle.toLowerCase() &&
              (!li.package || l.package?.toLowerCase() === li.package?.toLowerCase())
            );
            if (matchingLoc) {
               balanceInStock = Number(matchingLoc.quantity || 0);
            } else {
               const matchingCircles = dd.stockLocations.filter((l: any) => l.circle?.toLowerCase() === li.activeCircle.toLowerCase());
               balanceInStock = matchingCircles.reduce((sum: number, l: any) => sum + Number(l.quantity || 0), 0);
            }
          }
        }
      }
    }
    
    return {
      ...li,
      loaSrNo,
      tempCode,
      circleLoaQty,
      totalLoaQty,
      balanceInStock,
      itemId: {
        _id: li.itemIdStr,
        itemName: li.itemName,
        dynamicData: {
           loaSrNo,
           tempCode,
           nahanLoaQuantity: circleLoaQty,
           totalLoaQuantity: totalLoaQty,
        }
      },
    };
  });

  // Pagination
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;
  
  const total = lineItemsWithStock.length;
  const paginatedItems = lineItemsWithStock.slice(skip, skip + limitNum);

  res.status(200).json(
    new ApiResponse(200, {
      entries: paginatedItems,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }, 'DI Line items fetched successfully')
  );
});
