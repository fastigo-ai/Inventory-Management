import { Request, Response } from 'express';
import { ItemSummary } from './summary.schema';
import { PurchaseOrder } from '../../purchases/purchaseOrder.schema';
import { PurchaseInvoice } from '../../purchases/purchaseInvoice.schema';
import { ContractorAssignment } from '../../contractors/contractorAssignment.schema';
import { ContractorInvoice } from '../../contractor-billing/contractorInvoice.schema';
import { ContractorReturn } from '../../contractors/contractorReturn.schema';
import { DI } from '../../di/di.schema';
import { StoreInwardEntry } from '../../store/storeInwardEntry.schema';
import { StoreTransfer } from '../../store/storeTransfer.schema';
import Item from '../../items/item.model';
import { asyncHandler } from '../../../core/utils/asyncHandler';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import { stringify } from 'csv-stringify/sync';

const getCirclePackage = (circ?: string, fallbackPkg?: string): string => {
  const c = (circ || '').toLowerCase();
  if (c.includes('nahan') || c.includes('solan')) {
    return 'Package 1(S/N)';
  }
  if (c.includes('rampur') || c.includes('rohru')) {
    return 'Package 2(R/R)';
  }
  return fallbackPkg || 'All Packages';
};

export const getSummaries = asyncHandler(async (req: Request, res: Response) => {
  const { circle, package: pkg, itemName, description, loaSerialNo, tempCode, page = '1', limit = '50', companyId, sortField, sortOrder } = req.query;

  const filter: any = {};
  if (circle) filter.circle = circle;
  if (pkg) filter.package = pkg;
  if (companyId) filter.companyId = companyId;
  
  if (itemName) filter.itemName = { $regex: itemName, $options: 'i' };
  if (description) filter.description = { $regex: description, $options: 'i' };
  if (loaSerialNo) filter.loaSerialNo = { $regex: loaSerialNo, $options: 'i' };
  if (tempCode) filter.tempCode = tempCode; // Exact match for tempCode

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  let sortObj: any = { itemName: 1, circle: 1, package: 1 };
  if (sortField) {
    const field = sortField as string;
    const order = sortOrder === 'desc' ? -1 : 1;
    sortObj = { [field]: order };
  }

  const totalAggregation = await ItemSummary.aggregate([
    { $match: filter },
    { $group: { 
        _id: { itemName: "$itemName", circle: "$circle", package: "$package" },
        loaQty: { $sum: "$loaQty" },
        bomQty: { $sum: "$bomQty" },
        diQty: { $sum: "$diQty" },
        invQty: { $sum: "$invQty" },
        actQty: { $sum: "$actQty" },
        srtQty: { $sum: "$srtQty" },
        billedQty: { $sum: "$billedQty" }
      } 
    },
    { $group: { 
        _id: null, 
        total: { $sum: 1 },
        totalLoaQty: { $sum: "$loaQty" },
        totalBomQty: { $sum: "$bomQty" },
        totalDiQty: { $sum: "$diQty" },
        totalInvQty: { $sum: "$invQty" },
        totalActQty: { $sum: "$actQty" },
        totalSrtQty: { $sum: "$srtQty" },
        totalBilledQty: { $sum: "$billedQty" }
      } 
    }
  ]);
  const totalItems = totalAggregation.length > 0 ? totalAggregation[0].total : 0;
  
  const totals = totalAggregation.length > 0 ? {
    loaQty: totalAggregation[0].totalLoaQty,
    bomQty: totalAggregation[0].totalBomQty,
    diQty: totalAggregation[0].totalDiQty,
    invQty: totalAggregation[0].totalInvQty,
    actQty: totalAggregation[0].totalActQty,
    srtQty: totalAggregation[0].totalSrtQty,
    billedQty: totalAggregation[0].totalBilledQty,
    balLoaBilled: totalAggregation[0].totalLoaQty - totalAggregation[0].totalBilledQty,
    balBomBilled: totalAggregation[0].totalBomQty - totalAggregation[0].totalBilledQty,
    goodDispatch: totalAggregation[0].totalActQty,
    balDispatchVsDi: totalAggregation[0].totalDiQty - totalAggregation[0].totalActQty,
    diBalAsPerLoa: totalAggregation[0].totalLoaQty - totalAggregation[0].totalActQty,
    diBalAsPerBom: totalAggregation[0].totalBomQty - totalAggregation[0].totalActQty,
    balDiIssuedAsPerLoa: totalAggregation[0].totalLoaQty - totalAggregation[0].totalDiQty,
    balDiIssuedAsPerBom: totalAggregation[0].totalBomQty - totalAggregation[0].totalDiQty
  } : null;

  const summaries = await ItemSummary.aggregate([
    { $match: filter },
    { $group: {
        _id: { itemName: "$itemName", circle: "$circle", package: "$package" },
        itemId: { $first: "$itemId" },
        loaSerialNo: { $first: "$loaSerialNo" },
        tempCode: { $first: "$tempCode" },
        loaQty: { $sum: "$loaQty" },
        bomQty: { $sum: "$bomQty" },
        diQty: { $sum: "$diQty" },
        invQty: { $sum: "$invQty" },
        actQty: { $sum: "$actQty" },
        srtQty: { $sum: "$srtQty" },
        billedQty: { $sum: "$billedQty" }
      }
    },
    { $project: {
        _id: 0,
        itemId: 1,
        itemName: "$_id.itemName",
        circle: "$_id.circle",
        package: "$_id.package",
        loaSerialNo: 1,
        tempCode: 1,
        loaQty: 1,
        bomQty: 1,
        diQty: 1,
        invQty: 1,
        actQty: 1,
        srtQty: 1,
        billedQty: 1
      }
    },
    { $addFields: {
        balLoaBilled: { $subtract: [{ $ifNull: ["$loaQty", 0] }, { $ifNull: ["$billedQty", 0] }] },
        balBomBilled: { $subtract: [{ $ifNull: ["$bomQty", 0] }, { $ifNull: ["$billedQty", 0] }] },
        goodDispatch: { $ifNull: ["$actQty", 0] },
        balDispatchVsDi: { $subtract: [{ $ifNull: ["$diQty", 0] }, { $ifNull: ["$actQty", 0] }] },
        diBalAsPerLoa: { $subtract: [{ $ifNull: ["$loaQty", 0] }, { $ifNull: ["$actQty", 0] }] },
        diBalAsPerBom: { $subtract: [{ $ifNull: ["$bomQty", 0] }, { $ifNull: ["$actQty", 0] }] },
        balDiIssuedAsPerLoa: { $subtract: [{ $ifNull: ["$loaQty", 0] }, { $ifNull: ["$diQty", 0] }] },
        balDiIssuedAsPerBom: { $subtract: [{ $ifNull: ["$bomQty", 0] }, { $ifNull: ["$diQty", 0] }] },
        pendingInvoice: { $subtract: [{ $ifNull: ["$actQty", 0] }, { $ifNull: ["$billedQty", 0] }] },
        remainingLoa: { $subtract: [{ $ifNull: ["$loaQty", 0] }, { $ifNull: ["$billedQty", 0] }] },
        remainingBom: { $subtract: [{ $ifNull: ["$bomQty", 0] }, { $ifNull: ["$actQty", 0] }] },
        variance: { $subtract: [{ $ifNull: ["$diQty", 0] }, { $ifNull: ["$actQty", 0] }] },
        completionPercent: { 
          $cond: [
            { $gt: ["$loaQty", 0] },
            { $multiply: [{ $divide: [{ $ifNull: ["$actQty", 0] }, "$loaQty"] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: sortObj },
    { $skip: skip },
    { $limit: limitNum }
  ]);

  // Add calculated fields dynamically
  const enrichedSummaries = summaries.map(doc => {
    
    // Derived values matching handwritten report columns 1 to 12
    const balLoaBilled = (doc.loaQty || 0) - (doc.billedQty || 0);               // Column 5: LOA - Billed (1 - 4 = 5)
    const balBomBilled = (doc.bomQty || 0) - (doc.billedQty || 0);               // Column 6: BOM - Billed (2 - 4 = 6)
    const goodDispatch = doc.actQty || 0;                                        // Column 7: Good Dispatch
    const balDispatchVsDi = (doc.diQty || 0) - (doc.actQty || 0);                 // Column 8: DI - Good Dispatch (3 - 7 = 8)
    const diBalAsPerLoa = (doc.loaQty || 0) - (doc.actQty || 0);                  // Column 9: Dispatch Bal. Qty (as per LOA) (1 - 7 = 9)
    const diBalAsPerBom = (doc.bomQty || 0) - (doc.actQty || 0);                  // Column 10: Dispatch Bal. Qty (as per BOM) (2 - 7 = 10)
    const balDiIssuedAsPerLoa = (doc.loaQty || 0) - (doc.diQty || 0);             // Column 11: Bal. DI to Issue (as per LOA) (1 - 3 = 11)
    const balDiIssuedAsPerBom = (doc.bomQty || 0) - (doc.diQty || 0);             // Column 12: Bal. DI to Issue (as per BOM) (2 - 3 = 12)

    // Keep legacy calculations for compatibility if used elsewhere
    const remainingLoa = balLoaBilled;
    const remainingBom = (doc.bomQty || 0) - (doc.actQty || 0);
    const completionPercent = doc.loaQty ? ((doc.actQty || 0) / doc.loaQty) * 100 : 0;
    const variance = balDispatchVsDi;
    const pendingInvoice = (doc.actQty || 0) - (doc.billedQty || 0);

    return {
      ...doc,
      balLoaBilled,
      balBomBilled,
      goodDispatch,
      balDispatchVsDi,
      diBalAsPerLoa,
      diBalAsPerBom,
      balDiIssuedAsPerLoa,
      balDiIssuedAsPerBom,
      
      // Legacy fields
      remainingLoa,
      remainingBom,
      completionPercent: parseFloat(completionPercent.toFixed(2)),
      variance,
      pendingInvoice
    };
  });

  res.status(200).json(new ApiResponse(200, {
    items: enrichedSummaries,
    totals,
    pagination: {
      totalItems,
      currentPage: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalItems / limitNum)
    }
  }, 'Summaries fetched successfully'));
});

export const getVendorSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const matchQuery: any = { status: { $ne: 'Cancelled' } };
  
  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setUTCHours(23, 59, 59, 999);
      matchQuery.date.$lte = end;
    }
  }

  const summaries = await PurchaseOrder.aggregate([
    { $match: matchQuery },
    { $unwind: "$lineItems" },
    {
      $group: {
        _id: "$vendorName",
        poCount: { $addToSet: "$_id" },
        totalOrderedValue: { $sum: { $multiply: ["$lineItems.quantity", "$lineItems.rate"] } },
        totalInvoicedValue: { $sum: { $multiply: [{ $ifNull: ["$lineItems.invoicedQuantity", 0] }, "$lineItems.rate"] } },
        totalOrderedQty: { $sum: "$lineItems.quantity" },
        totalInvoicedQty: { $sum: { $ifNull: ["$lineItems.invoicedQuantity", 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        vendorName: "$_id",
        poCount: { $size: "$poCount" },
        totalOrderedValue: 1,
        totalInvoicedValue: 1,
        totalOrderedQty: 1,
        totalInvoicedQty: 1,
        pendingValue: { $subtract: ["$totalOrderedValue", "$totalInvoicedValue"] }
      }
    },
    { $sort: { totalOrderedValue: -1 } }
  ]);

  res.status(200).json(new ApiResponse(200, summaries, 'Vendor summary fetched successfully'));
});

export const getContractorSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const minMatch: any = {};
  const billMatch: any = { status: { $nin: ['Void', 'Rejected', 'Draft'] } };
  
  if (startDate || endDate) {
    const dateQuery: any = {};
    if (startDate) dateQuery.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setUTCHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    minMatch.assignmentDate = dateQuery;
    billMatch.date = dateQuery;
  }

  const minSummaries = await ContractorAssignment.aggregate([
    { $match: minMatch },
    { $unwind: "$lineItems" },
    {
      $group: {
        _id: "$contractorFarmName",
        totalIssuedQty: { $sum: "$lineItems.quantity" },
        totalIssuedValue: { $sum: { $multiply: ["$lineItems.quantity", "$lineItems.rate"] } },
        minCount: { $addToSet: "$_id" }
      }
    }
  ]);

  const billSummaries = await ContractorInvoice.aggregate([
    { $match: billMatch },
    {
      $lookup: {
        from: 'contractors',
        localField: 'contractorId',
        foreignField: '_id',
        as: 'contractor'
      }
    },
    { $unwind: { path: "$contractor", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$contractor.companyName",
        totalBilledValue: { $sum: "$grandTotal" },
        billCount: { $addToSet: "$_id" }
      }
    }
  ]);

  // Merge the two summaries in JS
  const contractorMap = new Map();
  minSummaries.forEach(m => {
    contractorMap.set(m._id || 'Unknown', {
      contractorName: m._id || 'Unknown',
      totalIssuedQty: m.totalIssuedQty,
      totalIssuedValue: m.totalIssuedValue,
      minCount: m.minCount.length,
      totalBilledValue: 0,
      billCount: 0
    });
  });

  billSummaries.forEach(b => {
    const name = b._id || 'Unknown';
    if (contractorMap.has(name)) {
      const data = contractorMap.get(name);
      data.totalBilledValue = b.totalBilledValue;
      data.billCount = b.billCount.length;
    } else {
      contractorMap.set(name, {
        contractorName: name,
        totalIssuedQty: 0,
        totalIssuedValue: 0,
        minCount: 0,
        totalBilledValue: b.totalBilledValue,
        billCount: b.billCount.length
      });
    }
  });

  const merged = Array.from(contractorMap.values()).map(c => ({
    ...c,
    balanceLiability: c.totalIssuedValue - c.totalBilledValue
  })).sort((a, b) => b.totalIssuedValue - a.totalIssuedValue);

  res.status(200).json(new ApiResponse(200, merged, 'Contractor summary fetched successfully'));
});

export const getStoreSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  const matchQuery: any = { status: 'VERIFIED' };
  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) matchQuery.date.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setUTCHours(23, 59, 59, 999);
      matchQuery.date.$lte = end;
    }
  }

  const summaries = await StoreInwardEntry.aggregate([
    { $match: matchQuery },
    { $unwind: "$packingList" },
    {
      $group: {
        _id: "$circle",
        totalReceivedQty: { $sum: "$packingList.quantity" },
        totalValue: { $sum: { $multiply: ["$packingList.quantity", { $ifNull: ["$rate", 0] }] } },
        inwardCount: { $addToSet: "$_id" }
      }
    },
    {
      $project: {
        _id: 0,
        storeName: { $ifNull: ["$_id", "Unassigned Store"] },
        totalReceivedQty: 1,
        totalValue: 1,
        inwardCount: { $size: "$inwardCount" }
      }
    },
    { $sort: { totalValue: -1 } }
  ]);

  res.status(200).json(new ApiResponse(200, summaries, 'Store summary fetched successfully'));
});

export const getVendorDetails = asyncHandler(async (req: Request, res: Response) => {
  const { vendorName } = req.params;
  
  const pos = await PurchaseOrder.find({ vendorName, status: { $ne: 'Cancelled' } }).sort({ date: 1 });
  const invoices = await PurchaseInvoice.find({ vendorName, status: { $ne: 'Cancelled' } }).sort({ receiveDate: 1 });

  res.status(200).json(new ApiResponse(200, { pos, invoices }, 'Vendor details fetched successfully'));
});

export const getContractorDetails = asyncHandler(async (req: Request, res: Response) => {
  const { contractorName } = req.params;
  
  const mins = await ContractorAssignment.find({ contractorFarmName: contractorName }).sort({ assignmentDate: 1 });
  
  // We need to match ContractorInvoice by the actual contractor name.
  // Since ContractorInvoice only has contractorId, we can either look up or if we pass the contractorId from frontend.
  // Wait, in ContractorSummary we aggregated by contractor name. Let's just lookup the contractor.
  const invoices = await ContractorInvoice.aggregate([
    {
      $lookup: {
        from: 'contractors',
        localField: 'contractorId',
        foreignField: '_id',
        as: 'contractor'
      }
    },
    { $unwind: "$contractor" },
    { $match: { "contractor.companyName": contractorName, status: { $nin: ['Void', 'Rejected', 'Draft'] } } },
    { $sort: { date: -1 } }
  ]);

  res.status(200).json(new ApiResponse(200, { mins, invoices }, 'Contractor details fetched successfully'));
});

export const getItemDetails = asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  
  const pos = await PurchaseOrder.find({ "lineItems.itemId": itemId, status: { $ne: 'Cancelled' } }).sort({ date: 1 });
  const dis = await DI.find({ "lineItems.itemId": itemId, status: { $ne: 'Cancelled' } }).sort({ date: 1 });
  const invoices = await PurchaseInvoice.find({ "lineItems.itemId": itemId, status: { $ne: 'Cancelled' } }).sort({ receiveDate: 1 });
  const mins = await ContractorAssignment.find({ "lineItems.itemId": itemId }).sort({ assignmentDate: 1 });

  res.status(200).json(new ApiResponse(200, { pos, dis, invoices, mins }, 'Item details fetched successfully'));
});

/**
 * Shared calculation engine for Store Itemised Summary (FROM CIRCLE STORE - Item Wise)
 */
async function computeStoreItemisedSummary(params: {
  circle?: string;
  store?: string;
  package?: string;
  search?: string;
  tempCode?: string;
  itemName?: string;
  hideZeroBalance?: boolean;
  viewMode?: 'item' | 'loa';
}) {
  const { circle, store, package: pkg, search, tempCode, itemName, hideZeroBalance, viewMode = 'item' } = params;

  // Filter items (only match name, tempCode, search)
  const itemFilter: any = { isDeleted: { $ne: true } };

  if (tempCode && tempCode.trim() !== '') {
    const t = tempCode.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter['dynamicData.tempCode'] = { $regex: `^${t}$`, $options: 'i' };
  }
  if (itemName && itemName.trim() !== '') {
    const n = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter['dynamicData.name'] = { $regex: `^${n}$`, $options: 'i' };
  }
  if (search && search.trim() !== '') {
    const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter.$or = [
      { 'dynamicData.name': { $regex: `^${s}$`, $options: 'i' } },
      { 'dynamicData.tempCode': { $regex: `^${s}$`, $options: 'i' } },
      { 'dynamicData.sku': { $regex: `^${s}$`, $options: 'i' } }
    ];
  }

  const items = await Item.find(itemFilter).lean();

  // Circle or Store matching regex
  const locMatch = store && store !== 'all' ? store : (circle && circle !== 'all' ? circle : null);
  const locRegex = locMatch ? new RegExp(locMatch, 'i') : null;

  if (viewMode === 'item') {
    // ----------------------------------------------------
    // A. ITEM-WISE AGGREGATION (Grouped by Temp Code / Name)
    // ----------------------------------------------------
    const groupMap = new Map<string, any>();

    items.forEach(it => {
      const d = it.dynamicData || {};
      const temp = String(d.tempCode || it.tempCode || '').trim();
      const tempNum = Number(temp);
      const hasValidTemp = !isNaN(tempNum) && tempNum > 0;
      const name = String(d.name || d.itemName || d.description || it.name || it.itemName || it.description || 'Unnamed Item').trim();
      const unit = String(d.unit || it.unit || 'Nos').trim();
      const circleVal = String(d.circle || it.circle || circle || '').trim();

      const groupKey = hasValidTemp ? `TEMP_${temp}` : `NAME_${name.toLowerCase()}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          itemIds: new Set<string>(),
          tempCode: temp || '-',
          tempNum: hasValidTemp ? tempNum : 9999999,
          name,
          unit,
          circle: circleVal,
          receiptQty: 0,
          issuedQty: 0,
          returnedQty: 0,
          transferOutQty: 0,
          transferInQty: 0,
          balAtStore: 0
        });
      }

      groupMap.get(groupKey)!.itemIds.add(it._id.toString());
    });

    // 1. Inward Receipts
    const inwardFilter: any = {};
    if (locRegex) {
      inwardFilter.$or = [{ circle: locRegex }, { subcircle: locRegex }, { billingFrom: locRegex }, { store: locRegex }];
    }
    const inwards = await StoreInwardEntry.find(inwardFilter).lean();
    inwards.forEach(doc => {
      const idStr = doc.itemId ? doc.itemId.toString() : null;
      const qty = Number(doc.totalQty || doc.invoiceQty || doc.acceptedQty || doc.receivedQty || 0);
      const temp = String(doc.tempCode || '').trim();
      const name = String(doc.itemName || doc.name || doc.description || '').trim().toLowerCase();

      for (const grp of groupMap.values()) {
        if ((idStr && grp.itemIds.has(idStr)) || (temp && temp !== '-' && grp.tempCode === temp) || (name && grp.name.toLowerCase() === name)) {
          grp.receiptQty += qty;
          break;
        }
      }
    });

    // 2. Contractor Assignments (MINs)
    const assignFilter: any = { status: { $ne: 'Cancelled' } };
    if (locRegex) {
      assignFilter.$or = [{ location: locRegex }, { division: locRegex }, { 'lineItems.circle': locRegex }];
    }
    const assignments = await ContractorAssignment.find(assignFilter).lean();
    assignments.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || li.issuedQty || 0);
        const temp = String(li.tempCode || '').trim();
        const name = String(li.itemName || li.name || li.description || '').trim().toLowerCase();

        for (const grp of groupMap.values()) {
          if ((idStr && grp.itemIds.has(idStr)) || (temp && temp !== '-' && grp.tempCode === temp) || (name && grp.name.toLowerCase() === name)) {
            grp.issuedQty += qty;
            break;
          }
        }
      });
    });

    // 3. Contractor Returns
    const returnFilter: any = {};
    if (locRegex) {
      returnFilter.$or = [{ store: locRegex }, { circle: locRegex }];
    }
    const returns = await ContractorReturn.find(returnFilter).lean();
    returns.forEach(doc => {
      (doc.lineItems || doc.items || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || li.returnedQty || 0);
        const temp = String(li.tempCode || '').trim();
        const name = String(li.itemName || li.name || li.description || '').trim().toLowerCase();

        for (const grp of groupMap.values()) {
          if ((idStr && grp.itemIds.has(idStr)) || (temp && temp !== '-' && grp.tempCode === temp) || (name && grp.name.toLowerCase() === name)) {
            grp.returnedQty += qty;
            break;
          }
        }
      });
    });

    // 4. Store Transfers Out (Outward Register)
    const transferOutFilter: any = { registerType: 'OUTWARD', status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    if (locRegex) {
      transferOutFilter.fromStore = locRegex;
    }
    const transfersOut = await StoreTransfer.find(transferOutFilter).lean();
    transfersOut.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.dispatchedQty || it.quantity || it.requestedQty || it.receivedQty || 0);
        const temp = String(it.tempCode || '').trim();
        const name = String(it.itemName || it.name || it.description || '').trim().toLowerCase();

        for (const grp of groupMap.values()) {
          if ((idStr && grp.itemIds.has(idStr)) || (temp && grp.tempCode === temp) || (name && grp.name.toLowerCase() === name)) {
            grp.transferOutQty += qty;
            break;
          }
        }
      });
    });

    // 5. Store Transfers In (Incoming / Received at Store)
    const transferInFilter: any = { status: { $in: ['RECEIVED', 'IN_TRANSIT'] } };
    if (locRegex) {
      transferInFilter.toStore = locRegex;
    }
    const transfersIn = await StoreTransfer.find(transferInFilter).lean();
    transfersIn.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.receivedQty || it.dispatchedQty || it.quantity || it.requestedQty || 0);
        const temp = String(it.tempCode || '').trim();
        const name = String(it.itemName || it.name || it.description || '').trim().toLowerCase();

        for (const grp of groupMap.values()) {
          if ((idStr && grp.itemIds.has(idStr)) || (temp && grp.tempCode === temp) || (name && grp.name.toLowerCase() === name)) {
            grp.transferInQty += qty;
            break;
          }
        }
      });
    });

    let rows = Array.from(groupMap.values()).map(r => {
      r.balAtStore = r.receiptQty - r.issuedQty + r.returnedQty - r.transferOutQty + r.transferInQty;
      if (circle && circle !== 'all') {
        const cStr = circle.toString();
        r.circle = cStr.toUpperCase();
        r.package = getCirclePackage(cStr, r.package);
      }
      return r;
    });

    if (hideZeroBalance || locRegex || (pkg && pkg !== 'all')) {
      rows = rows.filter(r => r.receiptQty > 0 || r.issuedQty > 0 || r.returnedQty > 0 || r.transferOutQty > 0 || r.transferInQty > 0 || r.balAtStore !== 0);
    }

    // Sort by tempNum asc, then name
    rows.sort((a, b) => {
      if (a.tempNum !== b.tempNum) return a.tempNum - b.tempNum;
      return a.name.localeCompare(b.name);
    });

    const totals = rows.reduce((acc, curr) => {
      acc.receiptQty += curr.receiptQty;
      acc.issuedQty += curr.issuedQty;
      acc.returnedQty += curr.returnedQty;
      acc.transferOutQty += curr.transferOutQty;
      acc.transferInQty += curr.transferInQty;
      acc.balAtStore += curr.balAtStore;
      return acc;
    }, {
      receiptQty: 0,
      issuedQty: 0,
      returnedQty: 0,
      transferOutQty: 0,
      transferInQty: 0,
      balAtStore: 0
    });

    const indexedRows = rows.map((r, index) => ({
      srNo: index + 1,
      ...r
    }));

    return { rows: indexedRows, totals };

  } else {
    // ----------------------------------------------------
    // B. LOA BOM DETAILED VIEW (Row by Row per Item ID)
    // ----------------------------------------------------
    const itemMap = new Map<string, any>();
    items.forEach(it => {
      const d = it.dynamicData || {};
      const temp = String(d.tempCode || it.tempCode || '').trim();
      const tempNum = Number(temp);
      const hasValidTemp = !isNaN(tempNum) && tempNum > 0;
      const name = String(d.name || d.itemName || d.description || it.name || it.itemName || it.description || 'Unnamed Item').trim();

      itemMap.set(it._id.toString(), {
        itemId: it._id,
        tempCode: temp,
        tempNum: hasValidTemp ? tempNum : 9999999,
        sku: String(d.sku || d.loaSerialNo || it.sku || '').trim(),
        name,
        unit: d.unit || it.unit || 'Nos',
        package: d.package || it.package || '',
        circle: d.circle || it.circle || circle || '',
        receiptQty: 0,
        issuedQty: 0,
        returnedQty: 0,
        transferOutQty: 0,
        transferInQty: 0,
        balAtStore: 0
      });
    });

    const inwardFilter: any = {};
    if (locRegex) {
      inwardFilter.$or = [{ circle: locRegex }, { subcircle: locRegex }, { billingFrom: locRegex }, { store: locRegex }];
    }
    const inwards = await StoreInwardEntry.find(inwardFilter).lean();
    inwards.forEach(doc => {
      const idStr = doc.itemId ? doc.itemId.toString() : null;
      const qty = Number(doc.totalQty || doc.invoiceQty || doc.acceptedQty || doc.receivedQty || 0);
      if (idStr && itemMap.has(idStr)) {
        itemMap.get(idStr)!.receiptQty += qty;
      }
    });

    const assignFilter: any = { status: { $ne: 'Cancelled' } };
    if (locRegex) {
      assignFilter.$or = [{ location: locRegex }, { division: locRegex }, { 'lineItems.circle': locRegex }];
    }
    const assignments = await ContractorAssignment.find(assignFilter).lean();
    assignments.forEach(doc => {
      (doc.lineItems || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || li.issuedQty || 0);
        if (idStr && itemMap.has(idStr)) {
          itemMap.get(idStr)!.issuedQty += qty;
        }
      });
    });

    const returnFilter: any = {};
    if (locRegex) {
      returnFilter.$or = [{ store: locRegex }, { circle: locRegex }];
    }
    const returns = await ContractorReturn.find(returnFilter).lean();
    returns.forEach(doc => {
      (doc.lineItems || doc.items || []).forEach((li: any) => {
        const idStr = li.itemId ? li.itemId.toString() : null;
        const qty = Number(li.quantity || li.acceptedQuantity || li.returnedQty || 0);
        if (idStr && itemMap.has(idStr)) {
          itemMap.get(idStr)!.returnedQty += qty;
        }
      });
    });

    const transferOutFilter: any = { status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    if (locRegex) {
      transferOutFilter.fromStore = locRegex;
    }
    const transfersOut = await StoreTransfer.find(transferOutFilter).lean();
    transfersOut.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.dispatchedQty || it.quantity || it.requestedQty || it.receivedQty || 0);
        if (idStr && itemMap.has(idStr)) {
          itemMap.get(idStr)!.transferOutQty += qty;
        }
      });
    });

    const transferInFilter: any = { status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } };
    if (locRegex) {
      transferInFilter.toStore = locRegex;
    }
    const transfersIn = await StoreTransfer.find(transferInFilter).lean();
    transfersIn.forEach(doc => {
      (doc.items || []).forEach((it: any) => {
        const idStr = it.itemId ? it.itemId.toString() : null;
        const qty = Number(it.receivedQty || it.dispatchedQty || it.quantity || it.requestedQty || 0);
        if (idStr && itemMap.has(idStr)) {
          itemMap.get(idStr)!.transferInQty += qty;
        }
      });
    });

    let rows = Array.from(itemMap.values()).map(row => {
      row.balAtStore = row.receiptQty - row.issuedQty + row.returnedQty - row.transferOutQty + row.transferInQty;
      return row;
    });

    if (hideZeroBalance || locRegex || (pkg && pkg !== 'all')) {
      rows = rows.filter(r => r.receiptQty > 0 || r.issuedQty > 0 || r.returnedQty > 0 || r.transferOutQty > 0 || r.transferInQty > 0 || r.balAtStore !== 0);
    }

    rows.sort((a, b) => {
      if (a.tempNum !== b.tempNum) return a.tempNum - b.tempNum;
      const skuA = Number(a.sku) || 0;
      const skuB = Number(b.sku) || 0;
      if (skuA !== skuB) return skuA - skuB;
      return a.name.localeCompare(b.name);
    });

    const totals = rows.reduce((acc, curr) => {
      acc.receiptQty += curr.receiptQty;
      acc.issuedQty += curr.issuedQty;
      acc.returnedQty += curr.returnedQty;
      acc.transferOutQty += curr.transferOutQty;
      acc.transferInQty += curr.transferInQty;
      acc.balAtStore += curr.balAtStore;
      return acc;
    }, {
      receiptQty: 0,
      issuedQty: 0,
      returnedQty: 0,
      transferOutQty: 0,
      transferInQty: 0,
      balAtStore: 0
    });

    const indexedRows = rows.map((r, index) => ({
      srNo: index + 1,
      ...r
    }));

    return { rows: indexedRows, totals };
  }
}

/**
 * GET /api/v1/reports/store-itemised-summary
 */
export const getStoreItemisedSummary = asyncHandler(async (req: Request, res: Response) => {
  const { circle, store, package: pkg, search, tempCode, itemName, hideZeroBalance, viewMode, page, limit } = req.query;

  const { rows, totals } = await computeStoreItemisedSummary({
    circle: circle as string,
    store: store as string,
    package: pkg as string,
    search: search as string,
    tempCode: tempCode as string,
    itemName: itemName as string,
    hideZeroBalance: hideZeroBalance === 'true',
    viewMode: (viewMode as any) || 'item'
  });

  let paginatedRows = rows;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  if (pageNum && limitNum) {
    const skip = (pageNum - 1) * limitNum;
    paginatedRows = rows.slice(skip, skip + limitNum);
  }

  res.status(200).json(new ApiResponse(200, {
    items: paginatedRows,
    totals,
    pagination: {
      totalItems: rows.length,
      currentPage: pageNum || 1,
      limit: limitNum || rows.length,
      totalPages: limitNum ? Math.ceil(rows.length / limitNum) : 1
    }
  }, 'Store itemised summary fetched successfully'));
});

/**
 * GET /api/v1/reports/store-itemised-summary/export
 */
export const exportStoreItemisedSummary = asyncHandler(async (req: Request, res: Response) => {
  const { circle, store, package: pkg, search, tempCode, itemName, hideZeroBalance, viewMode } = req.query;

  const { rows } = await computeStoreItemisedSummary({
    circle: circle as string,
    store: store as string,
    package: pkg as string,
    search: search as string,
    tempCode: tempCode as string,
    itemName: itemName as string,
    hideZeroBalance: hideZeroBalance === 'true',
    viewMode: (viewMode as any) || 'item'
  });

  const headers = [
    'Sr No',
    'Temp Code',
    'Item Name',
    'Unit',
    'Total Receipt Qty',
    'Total Issued to Contractor',
    'Total Returned by Contractor',
    'Total Transfer to Other Store',
    'Total Received From Other Store',
    'Bal at Store'
  ];

  const exportData = rows.map(r => ({
    'Sr No': r.srNo,
    'Temp Code': r.tempCode,
    'Item Name': r.name,
    'Unit': r.unit,
    'Total Receipt Qty': r.receiptQty,
    'Total Issued to Contractor': r.issuedQty,
    'Total Returned by Contractor': r.returnedQty,
    'Total Transfer to Other Store': r.transferOutQty,
    'Total Received From Other Store': r.transferInQty,
    'Bal at Store': r.balAtStore
  }));

  const csv = stringify(exportData, { header: true, columns: headers });

  const fileName = `store_itemised_summary_${String(circle || store || 'all').toLowerCase()}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(csv);
});

/**
 * Shared Multi-Circle Matrix Engine matching Excel LOA/BOM summary layout
 */
async function computeItemMatrixSummary(params: {
  package?: string;
  circle?: string;
  targetCircle?: string;
  search?: string;
}) {
  const { package: pkg, circle, targetCircle = 'SOLAN', search } = params;

  const itemFilter: any = { isDeleted: { $ne: true } };

  if (pkg && pkg !== 'all' && pkg !== '') {
    itemFilter['dynamicData.package'] = { $regex: new RegExp(pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  }
  if (circle && circle !== 'all' && circle !== '') {
    itemFilter['dynamicData.circle'] = { $regex: new RegExp(`^${circle}$`, 'i') };
  }
  if (search) {
    const s = search.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter.$or = [
      { 'dynamicData.name': { $regex: s, $options: 'i' } },
      { 'dynamicData.tempCode': search.toString().trim() },
      { 'dynamicData.sku': { $regex: s, $options: 'i' } },
      { 'dynamicData.loaSerialNo': { $regex: s, $options: 'i' } }
    ];
  }

  const items = await Item.find(itemFilter).lean();

  // Group master items by unique Temp Code
  const groupedItemsMap = new Map<string, {
    loaSerialNo: string;
    tempCode: string;
    itemName: string;
    unit: string;
    package: string;
    itemIds: string[];
    nahanLoaQty: number;
    nahanBomQty: number;
    solanLoaQty: number;
    solanBomQty: number;
    rampurLoaQty: number;
    rampurBomQty: number;
    rohruLoaQty: number;
    rohruBomQty: number;
  }>();

  const itemIdToKeyMap = new Map<string, string>();

  items.forEach(it => {
    const d = it.dynamicData || {};
    const loaSrNo = String(d.loaSerialNo || d.loaSrNo || d.sku || d.tempCode || it.sku || it.tempCode || '').trim() || it._id.toString();
    const tc = String(d.tempCode || it.tempCode || '').trim();
    const name = String(d.name || d.itemName || d.description || it.name || '').trim();
    const unit = String(d.unit || it.unit || '').trim();
    const pkgVal = String(d.package || it.package || '').trim();

    if (!groupedItemsMap.has(loaSrNo)) {
      groupedItemsMap.set(loaSrNo, {
        loaSerialNo: loaSrNo,
        tempCode: tc,
        itemName: name,
        unit,
        package: pkgVal,
        itemIds: [],
        nahanLoaQty: 0,
        nahanBomQty: 0,
        solanLoaQty: 0,
        solanBomQty: 0,
        rampurLoaQty: 0,
        rampurBomQty: 0,
        rohruLoaQty: 0,
        rohruBomQty: 0,
      });
    }

    const grp = groupedItemsMap.get(loaSrNo)!;
    grp.itemIds.push(it._id.toString());
    itemIdToKeyMap.set(it._id.toString(), loaSrNo);

    if (!grp.itemName && name) grp.itemName = name;
    if (!grp.tempCode && tc) grp.tempCode = tc;
    if (!grp.unit && unit) grp.unit = unit;

    const circleLower = String(d.circle || it.circle || '').toLowerCase();
    const loaQty = Number(d.loaQuantity || d.quantity || 0);
    const bomQty = Number(d.bomQuantity || d.bomQty || 0);

    const solanLoa = Number(d.solanLoaQuantity) || (circleLower.includes('solan') ? loaQty : 0);
    const solanBom = Number(d.solanBomQuantity) || (circleLower.includes('solan') ? bomQty : 0);

    const nahanLoa = Number(d.nahanLoaQuantity) || (circleLower.includes('nahan') ? loaQty : 0);
    const nahanBom = Number(d.nahanBomQuantity) || (circleLower.includes('nahan') ? bomQty : 0);

    const rampurLoa = Number(d.rampurLoaQuantity) || (circleLower.includes('rampur') ? loaQty : 0);
    const rampurBom = Number(d.rampurBomQuantity) || (circleLower.includes('rampur') ? bomQty : 0);

    const rohruLoa = Number(d.rohruLoaQuantity) || (circleLower.includes('rohru') ? loaQty : 0);
    const rohruBom = Number(d.rohruBomQuantity) || (circleLower.includes('rohru') ? bomQty : 0);

    grp.solanLoaQty += solanLoa;
    grp.solanBomQty += solanBom;
    grp.nahanLoaQty += nahanLoa;
    grp.nahanBomQty += nahanBom;
    grp.rampurLoaQty += rampurLoa;
    grp.rampurBomQty += rampurBom;
    grp.rohruLoaQty += rohruLoa;
    grp.rohruBomQty += rohruBom;
  });

  const getTargetTempCodes = (lineItemId: any, lineTempCode: any, lineLoaSrNo?: any): string[] => {
    const keys = new Set<string>();
    const idStr = lineItemId ? lineItemId.toString() : '';
    if (idStr && itemIdToKeyMap.has(idStr)) {
      keys.add(itemIdToKeyMap.get(idStr)!);
    }
    const loaSr = String(lineLoaSrNo || '').trim();
    if (loaSr && groupedItemsMap.has(loaSr)) {
      keys.add(loaSr);
    }
    const tc = String(lineTempCode || '').trim();
    if (tc && groupedItemsMap.has(tc)) {
      keys.add(tc);
    }
    return Array.from(keys);
  };

  // 1. Dispatched (DI)
  const dis = await DI.find({ status: { $ne: 'Cancelled' } }).lean();
  const diMap = new Map<string, Record<string, number>>();

  dis.forEach(d => {
    const docCircle = (d.circle || '').toLowerCase();
    (d.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || 0);
      if (qty > 0) {
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku);
        targetTCs.forEach(tc => {
          const idStr = line.itemId ? line.itemId.toString() : '';
          const masterCircle = (itemIdToKeyMap.has(idStr) ? '' : '').toLowerCase();
          const lineCirc = (line.circle || docCircle || masterCircle || '').toLowerCase();
          if (!diMap.has(tc)) diMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
          const obj = diMap.get(tc)!;
          if (lineCirc.includes('solan')) obj.solan += qty;
          else if (lineCirc.includes('nahan')) obj.nahan += qty;
          else if (lineCirc.includes('rampur')) obj.rampur += qty;
          else if (lineCirc.includes('rohru')) obj.rohru += qty;
          else obj.nahan += qty;
        });
      }
    });
  });

  // 2. Inward (Store Receipts / MRN / SRV)
  const inwards = await StoreInwardEntry.find({}).lean();
  const inwardMap = new Map<string, Record<string, number>>();

  inwards.forEach(doc => {
    const qty = Number(doc.invoiceQty || doc.acceptedQty || doc.totalQty || 0);
    if (qty > 0) {
      const targetTCs = getTargetTempCodes(doc.itemId, doc.tempCode, doc.loaSerialNo || doc.loaSrNo || doc.sku);
      targetTCs.forEach(tc => {
        const circ = (doc.circle || doc.subcircle || doc.billingFrom || '').toLowerCase();
        if (!inwardMap.has(tc)) inwardMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
        const obj = inwardMap.get(tc)!;
        if (circ.includes('solan')) obj.solan += qty;
        else if (circ.includes('nahan')) obj.nahan += qty;
        else if (circ.includes('rampur')) obj.rampur += qty;
        else if (circ.includes('rohru')) obj.rohru += qty;
        else obj.nahan += qty;
      });
    }
  });

  // 3. MIN / Issue (Contractor Assignment)
  const mins = await ContractorAssignment.find({}).lean();
  const minMap = new Map<string, Record<string, number>>();

  mins.forEach(doc => {
    const docCirc = (doc.circle || '').toLowerCase();
    (doc.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || 0);
      if (qty > 0) {
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku);
        targetTCs.forEach(tc => {
          const lineCirc = (line.circle || docCirc || '').toLowerCase();
          if (!minMap.has(tc)) minMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
          const obj = minMap.get(tc)!;
          if (lineCirc.includes('solan')) obj.solan += qty;
          else if (lineCirc.includes('nahan')) obj.nahan += qty;
          else if (lineCirc.includes('rampur')) obj.rampur += qty;
          else if (lineCirc.includes('rohru')) obj.rohru += qty;
          else obj.nahan += qty;
        });
      }
    });
  });

  // 4. IMC & Erection Billed
  const contractorInvoices = await ContractorInvoice.find({ status: { $ne: 'Cancelled' as any } }).lean();
  const imcMap = new Map<string, Record<string, number>>();
  const erectionMap = new Map<string, Record<string, number>>();

  contractorInvoices.forEach(doc => {
    const docCirc = ((doc as any).circle || '').toLowerCase();
    ((doc as any).lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || line.installedQty || 0);
      if (qty > 0) {
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku);
        targetTCs.forEach(tc => {
          const lineCirc = (line.circle || docCirc || '').toLowerCase();
          if (!imcMap.has(tc)) imcMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
          if (!erectionMap.has(tc)) erectionMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
          const imcObj = imcMap.get(tc)!;
          const erecObj = erectionMap.get(tc)!;
          if (lineCirc.includes('solan')) { imcObj.solan += qty; erecObj.solan += qty; }
          else if (lineCirc.includes('nahan')) { imcObj.nahan += qty; erecObj.nahan += qty; }
          else if (lineCirc.includes('rampur')) { imcObj.rampur += qty; erecObj.rampur += qty; }
          else if (lineCirc.includes('rohru')) { imcObj.rohru += qty; erecObj.rohru += qty; }
          else { imcObj.nahan += qty; erecObj.nahan += qty; }
        });
      }
    });
  });

  // 5. Supply Billed (Purchase Invoice)
  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  const supplyBilledMap = new Map<string, Record<string, number>>();

  pis.forEach(doc => {
    const docCirc = (doc.circle || '').toLowerCase();
    (doc.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || line.act || 0);
      if (qty > 0) {
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku);
        targetTCs.forEach(tc => {
          const lineCirc = (line.circle || docCirc || '').toLowerCase();
          if (!supplyBilledMap.has(tc)) supplyBilledMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
          const obj = supplyBilledMap.get(tc)!;
          if (lineCirc.includes('solan')) obj.solan += qty;
          else if (lineCirc.includes('nahan')) obj.nahan += qty;
          else if (lineCirc.includes('rampur')) obj.rampur += qty;
          else if (lineCirc.includes('rohru')) obj.rohru += qty;
          else obj.nahan += qty;
        });
      }
    });
  });

  // Build matrix rows for grouped items
  const matrixRows = Array.from(groupedItemsMap.values()).map((grp, idx) => {
    const tc = grp.tempCode;
    const tempNum = Number(tc);
    const itemName = grp.itemName || 'Unnamed Item';

    const nahanLoaQty = grp.nahanLoaQty;
    const nahanBomQty = grp.nahanBomQty;
    const solanLoaQty = grp.solanLoaQty;
    const solanBomQty = grp.solanBomQty;
    const rampurLoaQty = grp.rampurLoaQty;
    const rampurBomQty = grp.rampurBomQty;
    const rohruLoaQty = grp.rohruLoaQty;
    const rohruBomQty = grp.rohruBomQty;

    const diObj = diMap.get(tc) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const invObj = inwardMap.get(tc) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const minObj = minMap.get(tc) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const imcObj = imcMap.get(tc) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const supObj = supplyBilledMap.get(tc) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const erecObj = erectionMap.get(tc) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };

    const tCirc = (targetCircle as string).toUpperCase();
    let targetLoa = solanLoaQty;
    let targetBom = solanBomQty;
    let targetDi = diObj.solan;
    let targetInward = invObj.solan;
    let targetMin = minObj.solan;
    let targetImc = imcObj.solan;
    let targetSupBilled = supObj.solan;
    let targetErecBilled = erecObj.solan;

    if (tCirc.includes('NAHAN')) {
      targetLoa = nahanLoaQty; targetBom = nahanBomQty; targetDi = diObj.nahan; targetInward = invObj.nahan; targetMin = minObj.nahan; targetImc = imcObj.nahan; targetSupBilled = supObj.nahan; targetErecBilled = erecObj.nahan;
    } else if (tCirc.includes('RAMPUR')) {
      targetLoa = rampurLoaQty; targetBom = rampurBomQty; targetDi = diObj.rampur; targetInward = invObj.rampur; targetMin = minObj.rampur; targetImc = imcObj.rampur; targetSupBilled = supObj.rampur; targetErecBilled = erecObj.rampur;
    } else if (tCirc.includes('ROHRU')) {
      targetLoa = rohruLoaQty; targetBom = rohruBomQty; targetDi = diObj.rohru; targetInward = invObj.rohru; targetMin = minObj.rohru; targetImc = imcObj.rohru; targetSupBilled = supObj.rohru; targetErecBilled = erecObj.rohru;
    } else if (tCirc === 'ALL') {
      targetLoa = nahanLoaQty + solanLoaQty + rampurLoaQty + rohruLoaQty;
      targetBom = nahanBomQty + solanBomQty + rampurBomQty + rohruBomQty;
      targetDi = diObj.nahan + diObj.solan + diObj.rampur + diObj.rohru;
      targetInward = invObj.nahan + invObj.solan + invObj.rampur + invObj.rohru;
      targetMin = minObj.nahan + minObj.solan + minObj.rampur + minObj.rohru;
      targetImc = imcObj.nahan + imcObj.solan + imcObj.rampur + imcObj.rohru;
      targetSupBilled = supObj.nahan + supObj.solan + supObj.rampur + supObj.rohru;
      targetErecBilled = erecObj.nahan + erecObj.solan + erecObj.rampur + erecObj.rohru;
    }

    const balDiLoa = targetLoa - targetDi;
    const balDiBom = targetBom - targetDi;
    const balMrn = targetDi - targetInward;
    const balImc = targetInward - targetMin;
    const balSupplyBill = targetInward - targetSupBilled;
    const balErectionBill = targetImc - targetErecBilled;

    return {
      _id: grp.itemIds[0],
      itemId: grp.itemIds[0],
      tempNum: isNaN(tempNum) ? 999999 : tempNum,
      srNo: idx + 1,
      loaSerialNo: grp.loaSerialNo,
      tempCode: tc,
      itemName,
      unit: grp.unit || 'NOS',
      package: grp.package,
      circle: tCirc,

      // Flat LOA & BOM
      solanLoaQty,
      solanBomQty,
      nahanLoaQty,
      nahanBomQty,
      rampurLoaQty,
      rampurBomQty,
      rohruLoaQty,
      rohruBomQty,

      // Flat DI
      dispatchedNahan: diObj.nahan,
      dispatchedSolan: diObj.solan,
      dispatchedRampur: diObj.rampur,
      dispatchedRohru: diObj.rohru,

      // Flat Inward
      inwardNahan: invObj.nahan,
      inwardSolan: invObj.solan,
      inwardRampur: invObj.rampur,
      inwardRohru: invObj.rohru,

      // Flat MIN
      minNahan: minObj.nahan,
      minSolan: minObj.solan,
      minRampur: minObj.rampur,
      minRohru: minObj.rohru,

      // Flat IMC
      imcNahan: imcObj.nahan,
      imcSolan: imcObj.solan,
      imcRampur: imcObj.rampur,
      imcRohru: imcObj.rohru,

      // Flat Supply Billed
      supplyBilledNahan: supObj.nahan,
      supplyBilledSolan: supObj.solan,
      supplyBilledRampur: supObj.rampur,
      supplyBilledRohru: supObj.rohru,

      // Flat Erection Billed
      erectionBilledNahan: erecObj.nahan,
      erectionBilledSolan: erecObj.solan,
      erectionBilledRampur: erecObj.rampur,
      erectionBilledRohru: erecObj.rohru,

      // Flat Balances
      balDiLoa,
      balDiBom,
      balMrn,
      balImc,
      balSupplyBill,
      balErectionBill,

      // Nested objects
      loaQuantities: { nahan: nahanLoaQty, solan: solanLoaQty, rampur: rampurLoaQty, rohru: rohruLoaQty },
      bomQuantities: { nahan: nahanBomQty, solan: solanBomQty, rampur: rampurBomQty, rohru: rohruBomQty },
      dispatched: diObj,
      inward: invObj,
      min: minObj,
      imc: imcObj,
      supplyBilled: supObj,
      erectionBilled: erecObj,
      balances: {
        diVsLoa: balDiLoa,
        diVsBom: balDiBom,
        mrn: balMrn,
        imc: balImc,
        supplyBill: balSupplyBill,
        erectionBill: balErectionBill
      }
    };
  });

  // Sort by temp code numerical order
  matrixRows.sort((a, b) => a.tempNum - b.tempNum);
  matrixRows.forEach((r, i) => r.srNo = i + 1);

  return matrixRows;
}

/**
 * GET /api/v1/reports/item-matrix-summary
 */
export const getItemMatrixSummary = asyncHandler(async (req: Request, res: Response) => {
  const { package: pkg, circle, targetCircle, search, page, limit } = req.query;

  const rows = await computeItemMatrixSummary({
    package: pkg as string,
    circle: circle as string,
    targetCircle: (targetCircle as string) || 'SOLAN',
    search: search as string
  });

  let paginatedRows = rows;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  if (pageNum && limitNum) {
    const skip = (pageNum - 1) * limitNum;
    paginatedRows = rows.slice(skip, skip + limitNum);
  }

  res.status(200).json(new ApiResponse(200, {
    items: paginatedRows,
    pagination: {
      totalItems: rows.length,
      currentPage: pageNum || 1,
      limit: limitNum || rows.length,
      totalPages: limitNum ? Math.ceil(rows.length / limitNum) : 1
    }
  }, 'Item matrix summary fetched successfully'));
});

/**
 * Store Contractor Summary (FROM CIRCLE STORE - Contractor Wise)
 */
export const getStoreContractorSummary = asyncHandler(async (req: Request, res: Response) => {
  const { contractorName, circle, package: pkg, search, hideZero, page = '1', limit = '50' } = req.query;

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;

  // 1. Fetch distinct contractors list for dropdown
  const assignContractors = await ContractorAssignment.distinct('contractorFarmName');
  const returnContractors = await ContractorReturn.distinct('contractorName');
  const contractorList = Array.from(new Set([...assignContractors, ...returnContractors]))
    .filter(Boolean)
    .sort((a, b) => (a as string).localeCompare(b as string));

  // 2. Filter master items (only search filter, so master items map properly across all transaction circles)
  const itemFilter: any = { isDeleted: { $ne: true } };

  if (search) {
    const s = search.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter.$or = [
      { 'dynamicData.name': { $regex: s, $options: 'i' } },
      { 'dynamicData.tempCode': search.toString().trim() },
      { 'dynamicData.sku': { $regex: s, $options: 'i' } },
      { 'dynamicData.loaSerialNo': { $regex: s, $options: 'i' } }
    ];
  }

  const items = await Item.find(itemFilter).lean();

  // Group master items by LOA Sr No / SKU / TempCode
  const groupMap = new Map<string, any>();
  const itemIdToKeyMap = new Map<string, string>();

  items.forEach(it => {
    const d = it.dynamicData || {};
    const loaSr = String(d.loaSerialNo || d.loaSrNo || d.sku || d.tempCode || it.sku || it.tempCode || '').trim() || it._id.toString();
    const tc = String(d.tempCode || it.tempCode || '').trim();
    const name = String(d.name || d.itemName || d.description || it.name || '').trim();
    const unit = String(d.unit || it.unit || 'NOS').trim();
    const pkgVal = String(d.package || it.package || '').trim();
    const circVal = String(d.circle || it.circle || '').trim();

    if (!groupMap.has(loaSr)) {
      const tempNum = Number(tc);
      groupMap.set(loaSr, {
        loaSerialNo: loaSr,
        tempCode: tc || '-',
        tempNum: !isNaN(tempNum) && tempNum > 0 ? tempNum : 999999,
        itemName: name,
        unit,
        package: pkgVal,
        circle: circVal,
        itemIds: new Set<string>(),
        totalIssuedQty: 0,
        totalReturnQty: 0,
        totalBalanceQty: 0,
      });
    }

    const grp = groupMap.get(loaSr)!;
    grp.itemIds.add(it._id.toString());
    itemIdToKeyMap.set(it._id.toString(), loaSr);

    if (!grp.itemName && name) grp.itemName = name;
    if (!grp.tempCode && tc) grp.tempCode = tc;
  });

  const getTargetKeys = (lineItemId: any, lineTempCode: any, lineLoaSrNo?: any): string[] => {
    const keys = new Set<string>();
    const idStr = lineItemId ? lineItemId.toString() : '';
    if (idStr && itemIdToKeyMap.has(idStr)) {
      keys.add(itemIdToKeyMap.get(idStr)!);
    }
    const loaSr = String(lineLoaSrNo || '').trim();
    if (loaSr && groupMap.has(loaSr)) keys.add(loaSr);
    const tc = String(lineTempCode || '').trim();
    if (tc && groupMap.has(tc)) keys.add(tc);
    return Array.from(keys);
  };

  // 3. Aggregate Contractor Assignments (Issued Qty)
  const assignFilter: any = { status: { $ne: 'Cancelled' } };
  if (contractorName && contractorName !== 'all') {
    assignFilter.contractorFarmName = { $regex: new RegExp(`^${contractorName.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  }
  if (circle && circle !== 'all') {
    const cRegex = new RegExp(circle.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    assignFilter.$or = [
      { location: cRegex },
      { circle: cRegex },
      { division: cRegex },
      { 'lineItems.circle': cRegex }
    ];
  }
  // Package filter moved to end to filter master items instead of DB querying (since DB might lack package field)

  const assignments = await ContractorAssignment.find(assignFilter).lean();
  assignments.forEach(doc => {
    const docCirc = doc.location || doc.circle;
    const docPkg = doc.package;

    (doc.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || line.demandQty || 0);
      if (qty > 0) {
        const targetKeys = getTargetKeys(line.itemId, line.tempCode, line.loaSerialNo || line.sku);
        targetKeys.forEach(key => {
          if (groupMap.has(key)) {
            const grp = groupMap.get(key)!;
            grp.totalIssuedQty += qty;
            if (docCirc) grp.circle = docCirc;
            else if (line.circle) grp.circle = line.circle;
            if (docPkg) grp.package = docPkg;
            else if (line.package) grp.package = line.package;
          }
        });
      }
    });
  });

  // 4. Aggregate Contractor Returns (Returned Qty)
  const returnFilter: any = {};
  if (contractorName && contractorName !== 'all') {
    returnFilter.contractorName = { $regex: new RegExp(`^${contractorName.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  }
  if (circle && circle !== 'all') {
    const cRegex = new RegExp(circle.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    returnFilter.$or = [
      { circle: cRegex },
      { store: cRegex },
      { location: cRegex }
    ];
  }

  const returns = await ContractorReturn.find(returnFilter).lean();
  returns.forEach(doc => {
    (doc.lineItems || doc.items || []).forEach((line: any) => {
      const qty = Number(line.quantity || 0);
      if (qty > 0) {
        const targetKeys = getTargetKeys(line.itemId, line.tempCode, line.loaSerialNo || line.sku);
        targetKeys.forEach(key => {
          if (groupMap.has(key)) {
            groupMap.get(key)!.totalReturnQty += qty;
          }
        });
      }
    });
  });

  // Compute Balance Qty per item
  let rows = Array.from(groupMap.values()).map(r => {
    r.totalBalanceQty = r.totalIssuedQty - r.totalReturnQty;
    if (circle && circle !== 'all') {
      const cStr = circle.toString();
      r.circle = cStr.toUpperCase();
      r.package = getCirclePackage(cStr, r.package);
    }
    return r;
  });

  // Filter out items where all quantities are 0 by default (unless hideZero === 'false')
  if (hideZero !== 'false') {
    rows = rows.filter(r => r.totalIssuedQty !== 0 || r.totalReturnQty !== 0 || r.totalBalanceQty !== 0);
  }

  if (circle && circle !== 'all') {
    const cFilter = circle.toString().toLowerCase();
    rows = rows.filter(r => (r.circle || '').toLowerCase().includes(cFilter));
  }

  // Filter by selected package if provided
  if (pkg && pkg !== 'all') {
    const pFilter = pkg.toString().toLowerCase();
    rows = rows.filter(r => (r.package || '').toLowerCase().includes(pFilter));
  }

  rows.sort((a, b) => {
    if (a.tempNum !== b.tempNum) return a.tempNum - b.tempNum;
    return a.itemName.localeCompare(b.itemName);
  });

  const totals = rows.reduce((acc, curr) => {
    acc.totalIssuedQty += curr.totalIssuedQty;
    acc.totalReturnQty += curr.totalReturnQty;
    acc.totalBalanceQty += curr.totalBalanceQty;
    return acc;
  }, {
    totalIssuedQty: 0,
    totalReturnQty: 0,
    totalBalanceQty: 0
  });

  const totalItemsCount = rows.length;
  const totalPages = Math.ceil(totalItemsCount / limitNum) || 1;
  const paginatedRows = rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map((r, i) => ({
    srNo: (pageNum - 1) * limitNum + i + 1,
    ...r
  }));

  res.status(200).json(new ApiResponse(200, {
    items: paginatedRows,
    totals,
    contractors: contractorList,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: totalItemsCount,
      limit: limitNum
    }
  }, 'Store Contractor Summary fetched successfully'));
});

