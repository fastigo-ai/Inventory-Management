import { Request, Response } from 'express';
import { ItemSummary } from './summary.schema';
import { PurchaseOrder } from '../../purchases/purchaseOrder.schema';
import { PurchaseInvoice } from '../../purchases/purchaseInvoice.schema';
import { ContractorAssignment } from '../../contractors/contractorAssignment.schema';
import { ContractorInvoice } from '../../contractor-billing/contractorInvoice.schema';
import { ContractorReturn } from '../../contractors/contractorReturn.schema';
import { JmcRegister } from '../../jmc/jmc.schema';
import { DI } from '../../di/di.schema';
import { StoreInwardEntry } from '../../store/storeInwardEntry.schema';
import { Mhrov } from '../../store/mhrov.schema';
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
  if (loaSerialNo) {
    const q = loaSerialNo as string;
    if (/^\d+$/.test(q)) {
      filter.loaSerialNo = q;
    } else {
      filter.loaSerialNo = { $regex: q, $options: 'i' };
    }
  }
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

  // Get PO aggregations
  const poSummaries = await PurchaseOrder.aggregate([
    { $match: matchQuery },
    { $unwind: "$lineItems" },
    {
      $group: {
        _id: "$vendorName",
        poCount: { $addToSet: "$_id" },
        totalOrderedValue: { $sum: { $multiply: ["$lineItems.quantity", "$lineItems.rate"] } },
        totalOrderedQty: { $sum: "$lineItems.quantity" }
      }
    }
  ]);

  // Get PI aggregations (for invoices)
  const piSummaries = await PurchaseInvoice.aggregate([
    { $match: matchQuery },
    { $unwind: "$lineItems" },
    {
      $group: {
        _id: "$vendorName",
        totalInvoicedValue: { $sum: { $multiply: ["$lineItems.quantity", "$lineItems.rate"] } },
        totalInvoicedQty: { $sum: "$lineItems.quantity" }
      }
    }
  ]);

  // Merge the results
  const vendorMap = new Map();
  
  poSummaries.forEach(po => {
    vendorMap.set(po._id, {
      vendorName: po._id,
      poCount: po.poCount.length,
      totalOrderedValue: po.totalOrderedValue || 0,
      totalOrderedQty: po.totalOrderedQty || 0,
      totalInvoicedValue: 0,
      totalInvoicedQty: 0,
      pendingValue: po.totalOrderedValue || 0
    });
  });

  piSummaries.forEach(pi => {
    if (vendorMap.has(pi._id)) {
      const existing = vendorMap.get(pi._id);
      existing.totalInvoicedValue = pi.totalInvoicedValue || 0;
      existing.totalInvoicedQty = pi.totalInvoicedQty || 0;
      existing.pendingValue = existing.totalOrderedValue - existing.totalInvoicedValue;
    } else {
      vendorMap.set(pi._id, {
        vendorName: pi._id,
        poCount: 0,
        totalOrderedValue: 0,
        totalOrderedQty: 0,
        totalInvoicedValue: pi.totalInvoicedValue || 0,
        totalInvoicedQty: pi.totalInvoicedQty || 0,
        pendingValue: -(pi.totalInvoicedValue || 0)
      });
    }
  });

  const summaries = Array.from(vendorMap.values()).sort((a, b) => b.totalOrderedValue - a.totalOrderedValue);

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
    const t = tempCode.trim();
    itemFilter['dynamicData.tempCode'] = isNaN(Number(t)) ? t : { $in: [t, Number(t)] };
  }
  if (itemName && itemName.trim() !== '') {
    const n = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter['dynamicData.name'] = { $regex: n, $options: 'i' };
  }
  if (search && search.trim() !== '') {
    const s = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    itemFilter.$or = [
      { 'dynamicData.name': { $regex: s, $options: 'i' } },
      { 'dynamicData.tempCode': { $regex: s, $options: 'i' } },
      { 'dynamicData.sku': { $regex: s, $options: 'i' } }
    ];
  }

  // Circle, Store, or Package matching regex
  let locMatch = store && store !== 'all' ? store : (circle && circle !== 'all' ? circle : null);
  if (!locMatch && pkg && pkg !== 'all') {
    if (pkg.includes('Package 1')) {
      locMatch = 'Solan|Nahan';
    } else if (pkg.includes('Package 2')) {
      locMatch = 'Rampur|Rohru';
    }
  }
  const locRegex = locMatch ? new RegExp(locMatch, 'i') : null;

  if (locRegex) {
    const locCondition = {
      $or: [
        { 'dynamicData.circle': locRegex },
        { circle: locRegex }
      ]
    };
    if (itemFilter.$or) {
      itemFilter.$and = [{ $or: itemFilter.$or }, locCondition];
      delete itemFilter.$or;
    } else {
      itemFilter.$or = locCondition.$or;
    }
  }

  const items = await Item.find(itemFilter).lean();

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
      returnFilter.$or = [{ store: locRegex }, { circle: locRegex }, { division: locRegex }];
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

// In-memory cache for Matrix Summary to prevent expensive queries on every pagination/filter
const matrixCache = new Map<string, { timestamp: number; data: any[] }>();
const MATRIX_CACHE_TTL = 45 * 1000; // 45 seconds

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

  const cacheKey = `${pkg || ''}___${circle || ''}___${targetCircle || ''}___${search || ''}`;
  const cached = matrixCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < MATRIX_CACHE_TTL)) {
    return cached.data;
  }

  const itemFilter: any = { isDeleted: { $ne: true } };

  if (pkg && pkg !== 'all' && pkg !== '') {
    itemFilter['dynamicData.package'] = { $regex: new RegExp(pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  }
  if (circle && circle !== 'all' && circle !== '') {
    itemFilter['dynamicData.circle'] = { $regex: new RegExp(`^${circle}$`, 'i') };
  }
  if (search) {
    const searchTerm = search.toString().trim();
    const isNumeric = !isNaN(Number(searchTerm)) && searchTerm !== '';

    if (isNumeric) {
      itemFilter['dynamicData.tempCode'] = searchTerm;
    } else {
      const s = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      itemFilter.$or = [
        { 'dynamicData.name': { $regex: s, $options: 'i' } },
        { 'dynamicData.tempCode': searchTerm },
        { 'dynamicData.sku': { $regex: s, $options: 'i' } },
        { 'dynamicData.loaSerialNo': { $regex: s, $options: 'i' } }
      ];
    }
  }

  const items = await Item.find(itemFilter, { dynamicData: 1, tempCode: 1, sku: 1, name: 1, unit: 1, circle: 1, package: 1 }).lean();

  // Group master items by unique Circle + LOA Sr No
  const groupedItemsMap = new Map<string, {
    loaSerialNo: string;
    tempCode: string;
    itemName: string;
    unit: string;
    package: string;
    circle: string;
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
  const tempCodeToKeyMap = new Map<string, string>();

  items.forEach(it => {
    const d = it.dynamicData || {};
    const loaSrNo = String(d.loaSerialNo || d.loaSrNo || d.sku || d.tempCode || it.sku || it.tempCode || '').trim() || it._id.toString();
    const tc = String(d.tempCode || it.tempCode || '').trim();
    const name = String(d.name || d.itemName || d.description || it.name || '').trim();
    const unit = String(d.unit || it.unit || '').trim();
    const pkgVal = String(d.package || it.package || '').trim();
    const circleVal = String(d.circle || it.circle || '').trim();

    // Group by Package + Circle + Temp Code for a flat layout
    const groupKey = `${pkgVal ? pkgVal + '___' : ''}${circleVal ? circleVal + '___' : ''}${tc}`;

    if (!groupedItemsMap.has(groupKey)) {
      groupedItemsMap.set(groupKey, {
        loaSerialNo: loaSrNo,
        tempCode: tc,
        itemName: name,
        unit,
        package: pkgVal,
        circle: circleVal,
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

    const grp = groupedItemsMap.get(groupKey)!;
    grp.itemIds.push(it._id.toString());
    itemIdToKeyMap.set(it._id.toString(), groupKey);
    if (tc) tempCodeToKeyMap.set(`${pkgVal ? pkgVal + '___' : ''}${tc}`, groupKey);
    if (tc) tempCodeToKeyMap.set(`${pkgVal ? pkgVal + '___' : ''}${circleVal ? circleVal + '___' : ''}${tc}`, groupKey);

    if (!grp.itemName && name) grp.itemName = name;
    if (!grp.tempCode && tc) grp.tempCode = tc;
    if (!grp.unit && unit) grp.unit = unit;

    const circleLower = circleVal.toLowerCase();
    const loaQty = Number(d.loaQuantity || d.quantity || 0);
    const bomQty = Number(d.bomQuantity || d.bomQty || 0);

    // Each item strictly belongs to ONE circle
    if (circleLower.includes('solan')) {
      grp.solanLoaQty += loaQty || Number(d.solanLoaQuantity || 0);
      grp.solanBomQty += bomQty || Number(d.solanBomQuantity || 0);
    } else if (circleLower.includes('nahan')) {
      grp.nahanLoaQty += loaQty || Number(d.nahanLoaQuantity || 0);
      grp.nahanBomQty += bomQty || Number(d.nahanBomQuantity || 0);
    } else if (circleLower.includes('rampur')) {
      grp.rampurLoaQty += loaQty || Number(d.rampurLoaQuantity || 0);
      grp.rampurBomQty += bomQty || Number(d.rampurBomQuantity || 0);
    } else if (circleLower.includes('rohru')) {
      grp.rohruLoaQty += loaQty || Number(d.rohruLoaQuantity || 0);
      grp.rohruBomQty += bomQty || Number(d.rohruBomQuantity || 0);
    }
  });

  const getTargetTempCodes = (lineItemId: any, lineTempCode: any, lineLoaSrNo?: any, linePkg?: any, lineCircle?: any): string[] => {
    const idStr = lineItemId ? lineItemId.toString() : '';
    const circ = String(lineCircle || '').trim().toLowerCase();

    if (idStr && itemIdToKeyMap.has(idStr)) {
      const mappedKey = itemIdToKeyMap.get(idStr)!;
      const grp = groupedItemsMap.get(mappedKey);
      
      // Validation: If the circle is specified in the transaction (e.g. MIN was for Rohru)
      // but the master item we got by ID belongs to Solan, the ID is an erroneous cross-circle 
      // assignment from the UI. We should ignore it and rely on the fallback logic below.
      if (grp && circ && !grp.circle.toLowerCase().includes(circ)) {
         // Cross-circle mismatch, ignore this itemId
      } else {
         return [mappedKey];
      }
    }
    const loaSr = String(lineLoaSrNo || '').trim();

    if (loaSr && circ) {
      for (const [k, grp] of groupedItemsMap.entries()) {
        if (grp.loaSerialNo === loaSr && grp.circle.toLowerCase().includes(circ)) {
          return [k];
        }
      }
    }
    if (loaSr) {
      for (const [k, grp] of groupedItemsMap.entries()) {
        if (grp.loaSerialNo === loaSr) {
          return [k];
        }
      }
    }
    let tc = String(lineTempCode || '').trim();
    if (!tc && lineItemId) {
      const k = itemIdToKeyMap.get(lineItemId.toString());
      if (k) {
        tc = groupedItemsMap.get(k)?.tempCode || '';
      }
    }

    if (tc && circ) {
      const matches: string[] = [];
      for (const [k, grp] of groupedItemsMap.entries()) {
        if (grp.tempCode === tc && grp.circle.toLowerCase().includes(circ)) {
          matches.push(k);
        }
      }
      if (matches.length > 0) return matches; // Return ALL matches for proportional distribution
    }
    
    if (lineItemId) {
      const k = itemIdToKeyMap.get(lineItemId.toString());
      if (k) return [k];
    }
    return [];
  };

  // 1-5. Run all 7 transaction queries concurrently in parallel with tight field projection
  const [dis, inwards, mhrovs, mins, jmcs, contractorInvoices, pis] = await Promise.all([
    DI.find(
      { status: { $ne: 'Cancelled' } },
      { circle: 1, 'lineItems.quantity': 1, 'lineItems.itemId': 1, 'lineItems.tempCode': 1, 'lineItems.loaSerialNo': 1, 'lineItems.loaSrNo': 1, 'lineItems.circle': 1 }
    ).lean(),
    StoreInwardEntry.find(
      {},
      { circle: 1, subcircle: 1, billingFrom: 1, invoiceQty: 1, acceptedQty: 1, totalQty: 1, itemId: 1, tempCode: 1, loaSerialNo: 1, loaSrNo: 1, serialNumber: 1, package: 1 }
    ).lean(),
    Mhrov.find(
      { status: { $ne: 'Cancelled' } },
      { circle: 1, 'items.mhrovDoneQty': 1, 'items.itemId': 1 }
    ).lean(),
    ContractorAssignment.find(
      {},
      { circle: 1, 'lineItems.quantity': 1, 'lineItems.itemId': 1, 'lineItems.tempCode': 1, 'lineItems.loaSerialNo': 1, 'lineItems.loaSrNo': 1, 'lineItems.circle': 1 }
    ).lean(),
    JmcRegister.find(
      { status: { $nin: ['Rejected', 'Cancelled'] } },
      { circle: 1, 'items.approvedQty': 1, 'items.claimedQty': 1, 'items.itemId': 1, 'items.tempCode': 1, 'items.loaSerialNo': 1, 'items.loaSrNo': 1, 'items.circle': 1 }
    ).lean(),
    ContractorInvoice.find(
      { status: { $ne: 'Cancelled' as any } },
      { circle: 1, 'lineItems.quantity': 1, 'lineItems.installedQty': 1, 'lineItems.itemId': 1, 'lineItems.tempCode': 1, 'lineItems.loaSerialNo': 1, 'lineItems.loaSrNo': 1, 'lineItems.circle': 1 }
    ).lean(),
    PurchaseInvoice.find(
      { status: { $ne: 'Cancelled' } },
      { circle: 1, 'lineItems.quantity': 1, 'lineItems.act': 1, 'lineItems.itemId': 1, 'lineItems.tempCode': 1, 'lineItems.loaSerialNo': 1, 'lineItems.loaSrNo': 1, 'lineItems.circle': 1 }
    ).lean()
  ]);

  // 1. Dispatched (DI)
  const diMap = new Map<string, Record<string, number>>();
  dis.forEach(d => {
    const docCircle = (d.circle || '').toLowerCase();
    (d.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCircle || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || d.package, lineCirc);
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!diMap.has(tc)) diMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const obj = diMap.get(tc)!;
           if (lineCirc.includes('solan')) obj.solan += qty;
           else if (lineCirc.includes('nahan')) obj.nahan += qty;
           else if (lineCirc.includes('rampur')) obj.rampur += qty;
           else if (lineCirc.includes('rohru')) obj.rohru += qty;
           else obj.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!diMap.has(tc)) diMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const obj = diMap.get(tc)!;
                 if (lineCirc.includes('solan')) obj.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) obj.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) obj.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) obj.rohru += distributedQty;
                 else obj.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // 2. Inward (Store Receipts / MRHOV / SRV)
  const inwardMap = new Map<string, Record<string, number>>();
  inwards.forEach(doc => {
    const qty = Number(doc.invoiceQty || doc.acceptedQty || doc.totalQty || 0);
    if (qty > 0) {
      const circ = (doc.circle || doc.subcircle || doc.billingFrom || '').toLowerCase();
      const targetTCs = getTargetTempCodes(doc.itemId, doc.tempCode, doc.serialNumber || doc.loaSerialNo || (doc as any).loaSrNo || (doc as any).sku, (doc as any).package, circ);
      
      if (targetTCs.length === 1) {
         const tc = targetTCs[0];
         if (!inwardMap.has(tc)) inwardMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
         const m = inwardMap.get(tc)!;
         if (circ.includes('solan')) m.solan += qty;
         else if (circ.includes('nahan')) m.nahan += qty;
         else if (circ.includes('rampur')) m.rampur += qty;
         else if (circ.includes('rohru')) m.rohru += qty;
         else m.nahan += qty;
      } else if (targetTCs.length > 1) {
         let totalLoaQty = 0;
         targetTCs.forEach(tc => {
            const grp = groupedItemsMap.get(tc);
            if (grp) {
               if (circ.includes('solan')) totalLoaQty += grp.solanLoaQty;
               else if (circ.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
               else if (circ.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
               else if (circ.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
            }
         });
         targetTCs.forEach(tc => {
            const grp = groupedItemsMap.get(tc);
            if (grp) {
               let myLoaQty = 0;
               if (circ.includes('solan')) myLoaQty = grp.solanLoaQty;
               else if (circ.includes('nahan')) myLoaQty = grp.nahanLoaQty;
               else if (circ.includes('rampur')) myLoaQty = grp.rampurLoaQty;
               else if (circ.includes('rohru')) myLoaQty = grp.rohruLoaQty;
               
               const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
               if (!inwardMap.has(tc)) inwardMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
               const m = inwardMap.get(tc)!;
               if (circ.includes('solan')) m.solan += distributedQty;
               else if (circ.includes('nahan')) m.nahan += distributedQty;
               else if (circ.includes('rampur')) m.rampur += distributedQty;
               else if (circ.includes('rohru')) m.rohru += distributedQty;
               else m.nahan += distributedQty;
            }
         });
      }
    }
  });

  // 2b. MHROV
  const mhrovMap = new Map<string, Record<string, number>>();
  mhrovs.forEach(doc => {
    const docCirc = (doc.circle || '').toLowerCase();
    (doc.items || []).forEach((line: any) => {
      const qty = Number(line.mhrovDoneQty || 0);
      if (qty > 0) {
        const targetTCs = getTargetTempCodes(line.itemId, undefined, undefined, undefined, docCirc);
        if (targetTCs.length === 1) {
          const tc = targetTCs[0];
          if (!mhrovMap.has(tc)) mhrovMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
          const m = mhrovMap.get(tc)!;
          if (docCirc.includes('solan')) m.solan += qty;
          else if (docCirc.includes('nahan')) m.nahan += qty;
          else if (docCirc.includes('rampur')) m.rampur += qty;
          else if (docCirc.includes('rohru')) m.rohru += qty;
          else m.nahan += qty;
        } else if (targetTCs.length > 1) {
          let totalLoaQty = 0;
          targetTCs.forEach(tc => {
            const grp = groupedItemsMap.get(tc);
            if (grp) {
               if (docCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
               else if (docCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
               else if (docCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
               else if (docCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
            }
          });
          targetTCs.forEach(tc => {
            const grp = groupedItemsMap.get(tc);
            if (grp) {
               let myLoaQty = 0;
               if (docCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
               else if (docCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
               else if (docCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
               else if (docCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
               
               const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
               if (!mhrovMap.has(tc)) mhrovMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
               const m = mhrovMap.get(tc)!;
               if (docCirc.includes('solan')) m.solan += distributedQty;
               else if (docCirc.includes('nahan')) m.nahan += distributedQty;
               else if (docCirc.includes('rampur')) m.rampur += distributedQty;
               else if (docCirc.includes('rohru')) m.rohru += distributedQty;
               else m.nahan += distributedQty;
            }
          });
        }
      }
    });
  });

  // 3. MIN / Issue (Contractor Assignment)
  const minMap = new Map<string, Record<string, number>>();
  mins.forEach(doc => {
    const docCirc = (doc.circle || '').toLowerCase();
    (doc.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCirc || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || (doc as any).package, lineCirc);
        
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!minMap.has(tc)) minMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const m = minMap.get(tc)!;
           if (lineCirc.includes('solan')) m.solan += qty;
           else if (lineCirc.includes('nahan')) m.nahan += qty;
           else if (lineCirc.includes('rampur')) m.rampur += qty;
           else if (lineCirc.includes('rohru')) m.rohru += qty;
           else m.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!minMap.has(tc)) minMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const m = minMap.get(tc)!;
                 if (lineCirc.includes('solan')) m.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) m.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) m.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) m.rohru += distributedQty;
                 else m.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // 4a. JMC Work (formerly IMC Work)
  const imcMap = new Map<string, Record<string, number>>();
  jmcs.forEach(doc => {
    const docCirc = ((doc as any).circle || '').toLowerCase();
    ((doc as any).items || []).forEach((line: any) => {
      const qty = Number(line.approvedQty || line.claimedQty || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCirc || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || (doc as any).package, lineCirc);
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!imcMap.has(tc)) imcMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const imcObj = imcMap.get(tc)!;
           if (lineCirc.includes('solan')) imcObj.solan += qty;
           else if (lineCirc.includes('nahan')) imcObj.nahan += qty;
           else if (lineCirc.includes('rampur')) imcObj.rampur += qty;
           else if (lineCirc.includes('rohru')) imcObj.rohru += qty;
           else imcObj.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!imcMap.has(tc)) imcMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const imcObj = imcMap.get(tc)!;
                 if (lineCirc.includes('solan')) imcObj.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) imcObj.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) imcObj.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) imcObj.rohru += distributedQty;
                 else imcObj.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // 4b. Erection Billed
  const erectionMap = new Map<string, Record<string, number>>();
  contractorInvoices.forEach(doc => {
    const docCirc = ((doc as any).circle || '').toLowerCase();
    ((doc as any).lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || line.installedQty || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCirc || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || (doc as any).package, lineCirc);
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!erectionMap.has(tc)) erectionMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const erecObj = erectionMap.get(tc)!;
           if (lineCirc.includes('solan')) erecObj.solan += qty;
           else if (lineCirc.includes('nahan')) erecObj.nahan += qty;
           else if (lineCirc.includes('rampur')) erecObj.rampur += qty;
           else if (lineCirc.includes('rohru')) erecObj.rohru += qty;
           else erecObj.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!erectionMap.has(tc)) erectionMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const erecObj = erectionMap.get(tc)!;
                 if (lineCirc.includes('solan')) erecObj.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) erecObj.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) erecObj.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) erecObj.rohru += distributedQty;
                 else erecObj.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // 5. Supply Billed (Purchase Invoice)
  const supplyBilledMap = new Map<string, Record<string, number>>();
  pis.forEach(doc => {
    const docCirc = (doc.circle || '').toLowerCase();
    (doc.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || line.act || 0);
      if (qty > 0) {
        const lineCirc = (line.circle || docCirc || '').toLowerCase();
        const targetTCs = getTargetTempCodes(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo || line.sku, line.package || (doc as any).package, lineCirc);
        if (targetTCs.length === 1) {
           const tc = targetTCs[0];
           if (!supplyBilledMap.has(tc)) supplyBilledMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
           const supObj = supplyBilledMap.get(tc)!;
           if (lineCirc.includes('solan')) supObj.solan += qty;
           else if (lineCirc.includes('nahan')) supObj.nahan += qty;
           else if (lineCirc.includes('rampur')) supObj.rampur += qty;
           else if (lineCirc.includes('rohru')) supObj.rohru += qty;
           else supObj.nahan += qty;
        } else if (targetTCs.length > 1) {
           let totalLoaQty = 0;
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 if (lineCirc.includes('solan')) totalLoaQty += grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) totalLoaQty += grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) totalLoaQty += grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) totalLoaQty += grp.rohruLoaQty;
              }
           });
           targetTCs.forEach(tc => {
              const grp = groupedItemsMap.get(tc);
              if (grp) {
                 let myLoaQty = 0;
                 if (lineCirc.includes('solan')) myLoaQty = grp.solanLoaQty;
                 else if (lineCirc.includes('nahan')) myLoaQty = grp.nahanLoaQty;
                 else if (lineCirc.includes('rampur')) myLoaQty = grp.rampurLoaQty;
                 else if (lineCirc.includes('rohru')) myLoaQty = grp.rohruLoaQty;
                 
                 const distributedQty = totalLoaQty > 0 ? (qty * (myLoaQty / totalLoaQty)) : (qty / targetTCs.length);
                 if (!supplyBilledMap.has(tc)) supplyBilledMap.set(tc, { solan: 0, nahan: 0, rampur: 0, rohru: 0 });
                 const supObj = supplyBilledMap.get(tc)!;
                 if (lineCirc.includes('solan')) supObj.solan += distributedQty;
                 else if (lineCirc.includes('nahan')) supObj.nahan += distributedQty;
                 else if (lineCirc.includes('rampur')) supObj.rampur += distributedQty;
                 else if (lineCirc.includes('rohru')) supObj.rohru += distributedQty;
                 else supObj.nahan += distributedQty;
              }
           });
        }
      }
    });
  });

  // Build matrix rows for grouped items
  const matrixRows = Array.from(groupedItemsMap.entries()).map(([groupKey, grp], idx) => {
    const tc = grp.tempCode;
    const tempNum = Number(tc);
    const itemName = grp.itemName || 'Unnamed Item';
    const itemCircle = (grp.circle || '').toUpperCase();

    const nahanLoaQty = grp.nahanLoaQty;
    const nahanBomQty = grp.nahanBomQty;
    const solanLoaQty = grp.solanLoaQty;
    const solanBomQty = grp.solanBomQty;
    const rampurLoaQty = grp.rampurLoaQty;
    const rampurBomQty = grp.rampurBomQty;
    const rohruLoaQty = grp.rohruLoaQty;
    const rohruBomQty = grp.rohruBomQty;

    const diObj = diMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const invObj = inwardMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const mhrovObj = mhrovMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const minObj = minMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const imcObj = imcMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const supObj = supplyBilledMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };
    const erecObj = erectionMap.get(groupKey) || { solan: 0, nahan: 0, rampur: 0, rohru: 0 };

    const tCirc = (targetCircle as string).toUpperCase();
    const evalCircle = (tCirc === 'ALL' || !tCirc) ? itemCircle : tCirc;

    let targetLoa = 0;
    let targetBom = 0;
    let targetDi = 0;
    let targetInward = 0;
    let targetMhrov = 0;
    let targetMin = 0;
    let targetImc = 0;
    let targetSupBilled = 0;
    let targetErecBilled = 0;

    if (evalCircle.includes('SOLAN')) {
      targetLoa = solanLoaQty; targetBom = solanBomQty; targetDi = diObj.solan; targetInward = invObj.solan; targetMhrov = mhrovObj.solan; targetMin = minObj.solan; targetImc = imcObj.solan; targetSupBilled = supObj.solan; targetErecBilled = erecObj.solan;
    } else if (evalCircle.includes('NAHAN')) {
      targetLoa = nahanLoaQty; targetBom = nahanBomQty; targetDi = diObj.nahan; targetInward = invObj.nahan; targetMhrov = mhrovObj.nahan; targetMin = minObj.nahan; targetImc = imcObj.nahan; targetSupBilled = supObj.nahan; targetErecBilled = erecObj.nahan;
    } else if (evalCircle.includes('RAMPUR')) {
      targetLoa = rampurLoaQty; targetBom = rampurBomQty; targetDi = diObj.rampur; targetInward = invObj.rampur; targetMhrov = mhrovObj.rampur; targetMin = minObj.rampur; targetImc = imcObj.rampur; targetSupBilled = supObj.rampur; targetErecBilled = erecObj.rampur;
    } else if (evalCircle.includes('ROHRU')) {
      targetLoa = rohruLoaQty; targetBom = rohruBomQty; targetDi = diObj.rohru; targetInward = invObj.rohru; targetMhrov = mhrovObj.rohru; targetMin = minObj.rohru; targetImc = imcObj.rohru; targetSupBilled = supObj.rohru; targetErecBilled = erecObj.rohru;
    }

    const balDiLoa = targetLoa - targetDi;
    const balDiBom = targetBom - targetDi;
    const balMrn = targetDi - targetInward;
    const balMhrov = targetInward - targetMhrov;
    const balImc = targetMhrov - targetMin;
    const balSupplyBill = targetInward - targetSupBilled;
    const balErectionBill = targetImc - targetErecBilled;

    const allBalances = {
      solan: {
        diVsLoa: solanLoaQty - diObj.solan,
        diVsBom: solanBomQty - diObj.solan,
        mrn: diObj.solan - invObj.solan,
        mhrov: invObj.solan - mhrovObj.solan,
        imc: mhrovObj.solan - minObj.solan,
        supplyBill: invObj.solan - supObj.solan,
        erectionBill: imcObj.solan - erecObj.solan
      },
      nahan: {
        diVsLoa: nahanLoaQty - diObj.nahan,
        diVsBom: nahanBomQty - diObj.nahan,
        mrn: diObj.nahan - invObj.nahan,
        mhrov: invObj.nahan - mhrovObj.nahan,
        imc: mhrovObj.nahan - minObj.nahan,
        supplyBill: invObj.nahan - supObj.nahan,
        erectionBill: imcObj.nahan - erecObj.nahan
      },
      rampur: {
        diVsLoa: rampurLoaQty - diObj.rampur,
        diVsBom: rampurBomQty - diObj.rampur,
        mrn: diObj.rampur - invObj.rampur,
        mhrov: invObj.rampur - mhrovObj.rampur,
        imc: mhrovObj.rampur - minObj.rampur,
        supplyBill: invObj.rampur - supObj.rampur,
        erectionBill: imcObj.rampur - erecObj.rampur
      },
      rohru: {
        diVsLoa: rohruLoaQty - diObj.rohru,
        diVsBom: rohruBomQty - diObj.rohru,
        mrn: diObj.rohru - invObj.rohru,
        mhrov: invObj.rohru - mhrovObj.rohru,
        imc: mhrovObj.rohru - minObj.rohru,
        supplyBill: invObj.rohru - supObj.rohru,
        erectionBill: imcObj.rohru - erecObj.rohru
      }
    };

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
      circle: grp.circle,

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
      
      // Flat MHROV
      mhrovNahan: mhrovObj.nahan,
      mhrovSolan: mhrovObj.solan,
      mhrovRampur: mhrovObj.rampur,
      mhrovRohru: mhrovObj.rohru,

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
      balMhrov,
      balImc,
      balSupplyBill,
      balErectionBill,

      // Nested objects
      loaQuantities: { nahan: nahanLoaQty, solan: solanLoaQty, rampur: rampurLoaQty, rohru: rohruLoaQty },
      bomQuantities: { nahan: nahanBomQty, solan: solanBomQty, rampur: rampurBomQty, rohru: rohruBomQty },
      dispatched: diObj,
      inward: invObj,
      mhrov: mhrovObj,
      min: minObj,
      imc: imcObj,
      supplyBilled: supObj,
      erectionBilled: erecObj,
      balances: {
        diVsLoa: balDiLoa,
        diVsBom: balDiBom,
        mrn: balMrn,
        mhrov: balMhrov,
        imc: balImc,
        supplyBill: balSupplyBill,
        erectionBill: balErectionBill
      },
      allBalances
    };
  });

  // Sort by temp code numerical order
  matrixRows.sort((a, b) => a.tempNum - b.tempNum);
  matrixRows.forEach((r, i) => r.srNo = i + 1);

  matrixCache.set(cacheKey, { timestamp: Date.now(), data: matrixRows });

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
    const searchTerm = search.toString().trim();
    const isNumeric = !isNaN(Number(searchTerm)) && searchTerm !== '';

    if (isNumeric) {
      itemFilter['dynamicData.tempCode'] = searchTerm;
    } else {
      const s = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      itemFilter.$or = [
        { 'dynamicData.name': { $regex: s, $options: 'i' } },
        { 'dynamicData.tempCode': searchTerm },
        { 'dynamicData.sku': { $regex: s, $options: 'i' } },
        { 'dynamicData.loaSerialNo': { $regex: s, $options: 'i' } }
      ];
    }
  }

  const items = await Item.find(itemFilter).lean();

  // Group master items by LOA Sr No / SKU / TempCode
  const groupMap = new Map<string, any>();
  const itemIdToKeyMap = new Map<string, string>();
  const tempCodeToKeyMap = new Map<string, string>();

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
    if (tc) tempCodeToKeyMap.set(tc, loaSr);

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
    if (tc) {
      if (tempCodeToKeyMap.has(tc)) {
        keys.add(tempCodeToKeyMap.get(tc)!);
      }
      if (groupMap.has(tc)) {
        keys.add(tc);
      }
    }
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


export const getVendorItemisedSummary = asyncHandler(async (req: Request, res: Response) => {
  const { vendorName, circles, pkg, subcircle, search, page = 1, limit = 10 } = req.query;
  
  if (!vendorName) {
    return res.status(400).json(new ApiResponse(400, null, "vendorName is required"));
  }

  const matchQuery: any = { 
    status: { $ne: 'Cancelled' }
  };
  
  if (vendorName !== 'All Vendors') {
    matchQuery.vendorName = vendorName;
  }
  
  const lineItemMatch: any = {};
  
  if (circles) {
    const circleArray = (circles as string).split(',').map(c => c.trim());
    lineItemMatch['lineItems.circle'] = { $in: circleArray };
  }

  if (pkg && pkg !== 'All Packages') {
    lineItemMatch['lineItems.package'] = pkg;
  }

  if (subcircle && subcircle !== 'All Sub-Circles') {
    lineItemMatch['lineItems.subcircle'] = subcircle;
  }
  
  if (search) {
    lineItemMatch['$or'] = [
      { 'lineItems.tempCode': new RegExp(`^${search}$`, 'i') },
      { 'lineItems.itemName': new RegExp(search as string, 'i') }
    ];
  }

  const piPipeline: any[] = [
    { $match: matchQuery },
    { $unwind: "$lineItems" }
  ];
  if (Object.keys(lineItemMatch).length > 0) piPipeline.push({ $match: lineItemMatch });
  piPipeline.push({
    $group: {
      _id: {
        tempCode: "$lineItems.tempCode",
        loaSerialNo: vendorName === 'All Vendors' ? "-" : "$lineItems.loaSerialNo",
        itemName: "$lineItems.itemName"
      },
      description: { $first: "$lineItems.description" },
      totalInvQty: { $sum: "$lineItems.quantity" }
    }
  });

  const piSummaries = await PurchaseInvoice.aggregate(piPipeline);

  const masterItems = await Item.find({ isDeleted: false }).lean();
  const masterMap = new Map();
  masterItems.forEach(mi => {
    const tempCode = String(mi.dynamicData?.tempCode).trim();
    if (tempCode) {
      if (!masterMap.has(tempCode)) masterMap.set(tempCode, []);
      masterMap.get(tempCode).push(mi.dynamicData);
    }
  });

  const itemMap = new Map();
  const getKey = (id: any) => `${id.tempCode || ''}-${id.itemName || ''}-${id.loaSerialNo || ''}`;

  piSummaries.forEach(pi => {
    const key = getKey(pi._id);
    let totalLoaQty = 0;
    
    const masterRows = masterMap.get(String(pi._id.tempCode).trim()) || [];
    masterRows.forEach((masterData: any) => {
      // Filter by Package if a specific package is selected
      if (pkg && pkg !== 'All Packages') {
        const normPkg = String(pkg).replace(/\s/g, '');
        const normMasterPkg = String(masterData.package).replace(/\s/g, '');
        if (normPkg !== normMasterPkg) return;
      }

      // Filter by Circle if specific circles are selected, else sum total loaQuantity
      if (circles && circles !== 'All Circles') {
        const circleArray = (circles as string).split(',').map(c => c.trim().toLowerCase());
        if (circleArray.includes('solan')) totalLoaQty += Number(masterData.solanLoaQuantity) || 0;
        if (circleArray.includes('nahan')) totalLoaQty += Number(masterData.nahanLoaQuantity) || 0;
        if (circleArray.includes('rampur')) totalLoaQty += Number(masterData.rampurLoaQuantity) || 0;
        if (circleArray.includes('rohru')) totalLoaQty += Number(masterData.rohruLoaQuantity) || 0;
      } else {
        totalLoaQty += Number(masterData.loaQuantity) || 0;
      }
    });

    itemMap.set(key, {
      tempCode: pi._id.tempCode,
      loaSerialNo: pi._id.loaSerialNo,
      itemName: pi._id.itemName,
      description: pi.description,
      totalLoaQty,
      totalInvQty: pi.totalInvQty
    });
  });

  const summaries = Array.from(itemMap.values()).sort((a, b) => {
    const tc1 = a.tempCode || '';
    const tc2 = b.tempCode || '';
    const num1 = parseInt(tc1);
    const num2 = parseInt(tc2);
    
    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 === num2) {
        return tc1.localeCompare(tc2);
      }
      return num1 - num2;
    }
    return tc1.localeCompare(tc2);
  });

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  
  const paginatedSummaries = summaries.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.status(200).json(new ApiResponse(200, {
    items: paginatedSummaries,
    pagination: {
      totalItems: summaries.length,
      currentPage: pageNum,
      totalPages: Math.ceil(summaries.length / limitNum),
      limit: limitNum
    }
  }, 'Vendor itemised summary fetched successfully'));
});
