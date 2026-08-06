import { Request, Response } from 'express';
import { ItemSummary } from './summary.schema';
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
