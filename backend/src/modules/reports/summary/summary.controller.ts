import { Request, Response } from 'express';
import { ItemSummary } from './summary.schema';
import { asyncHandler } from '../../../core/utils/asyncHandler';
import { ApiResponse } from '../../../core/utils/ApiResponse';

export const getSummaries = asyncHandler(async (req: Request, res: Response) => {
  const { circle, package: pkg, page = '1', limit = '50', companyId } = req.query;

  const filter: any = {};
  if (circle) filter.circle = circle;
  if (pkg) filter.package = pkg;
  if (companyId) filter.companyId = companyId;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const totalItems = await ItemSummary.countDocuments(filter);
  const summaries = await ItemSummary.find(filter)
    .sort({ itemName: 1, circle: 1, package: 1 })
    .skip(skip)
    .limit(limitNum);

  // Add calculated fields dynamically
  const enrichedSummaries = summaries.map(s => {
    const doc = s.toObject();
    
    // Derived values matching handwritten report columns 1 to 12
    const balLoaBilled = (doc.loaQty || 0) - (doc.billedQty || 0);               // Column 5: LOA - Billed
    const balBomBilled = (doc.bomQty || 0) - (doc.billedQty || 0);               // Column 6: BOM - Billed
    const goodDispatch = doc.actQty || 0;                                        // Column 7: Good Dispatch (actQty)
    const balDispatchVsDi = (doc.diQty || 0) - (doc.actQty || 0);                 // Column 8: DI - Good Dispatch
    const diBalAsPerLoa = (doc.loaQty || 0) - (doc.diQty || 0);                   // Column 9: LOA - DI
    const diBalAsPerBom = (doc.bomQty || 0) - (doc.diQty || 0);                   // Column 10: BOM - DI
    const balDiIssuedAsPerLoa = (doc.loaQty || 0) - (doc.actQty || 0);             // Column 11: LOA - Good Dispatch
    const balDiIssuedAsPerBom = (doc.bomQty || 0) - (doc.actQty || 0);             // Column 12: BOM - Good Dispatch

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
    pagination: {
      totalItems,
      currentPage: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalItems / limitNum)
    }
  }, 'Summaries fetched successfully'));
});
