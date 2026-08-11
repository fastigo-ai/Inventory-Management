import { Request, Response } from 'express';
import { ItemSummary } from './summary.schema';
import { PurchaseOrder } from '../../purchases/purchaseOrder.schema';
import { PurchaseInvoice } from '../../purchases/purchaseInvoice.schema';
import { ContractorAssignment } from '../../contractors/contractorAssignment.schema';
import { ContractorInvoice } from '../../contractor-billing/contractorInvoice.schema';
import { DI } from '../../di/di.schema';
import { StoreInwardEntry } from '../../store/storeInwardEntry.schema';
import { asyncHandler } from '../../../core/utils/asyncHandler';
import { ApiResponse } from '../../../core/utils/ApiResponse';

export const getSummaries = asyncHandler(async (req: Request, res: Response) => {
  const { circle, package: pkg, itemName, description, loaSerialNo, tempCode, page = '1', limit = '50', companyId } = req.query;

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
    diBalAsPerLoa: totalAggregation[0].totalLoaQty - totalAggregation[0].totalBomQty,
    diBalAsPerBom: totalAggregation[0].totalBomQty - totalAggregation[0].totalDiQty,
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
    { $sort: { itemName: 1, circle: 1, package: 1 } },
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
    const diBalAsPerLoa = (doc.loaQty || 0) - (doc.bomQty || 0);                  // Column 9: DI Bal. Qty (as per LOA) (1 - 2 = 9)
    const diBalAsPerBom = (doc.bomQty || 0) - (doc.diQty || 0);                   // Column 10: DI Bal. Qty (as per BOM) (2 - 3 = 10)
    const balDiIssuedAsPerLoa = (doc.loaQty || 0) - (doc.diQty || 0);             // Column 11: Bal. for DI Issued (as per LOA) (1 - 3 = 11)
    const balDiIssuedAsPerBom = (doc.bomQty || 0) - (doc.diQty || 0);             // Column 12: Bal. for DI Issued (as per BOM) (2 - 3 = 12)

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
  
  const pos = await PurchaseOrder.find({ vendorName, status: { $ne: 'Cancelled' } }).sort({ date: -1 });
  const invoices = await PurchaseInvoice.find({ vendorName, status: { $ne: 'Cancelled' } }).sort({ receiveDate: -1 });

  res.status(200).json(new ApiResponse(200, { pos, invoices }, 'Vendor details fetched successfully'));
});

export const getContractorDetails = asyncHandler(async (req: Request, res: Response) => {
  const { contractorName } = req.params;
  
  const mins = await ContractorAssignment.find({ contractorFarmName: contractorName }).sort({ assignmentDate: -1 });
  
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
  
  const pos = await PurchaseOrder.find({ "lineItems.itemId": itemId, status: { $ne: 'Cancelled' } }).sort({ date: -1 });
  const dis = await DI.find({ "lineItems.itemId": itemId, status: { $ne: 'Cancelled' } }).sort({ date: -1 });
  const invoices = await PurchaseInvoice.find({ "lineItems.itemId": itemId, status: { $ne: 'Cancelled' } }).sort({ receiveDate: -1 });
  const mins = await ContractorAssignment.find({ "lineItems.itemId": itemId }).sort({ assignmentDate: -1 });

  res.status(200).json(new ApiResponse(200, { pos, dis, invoices, mins }, 'Item details fetched successfully'));
});
