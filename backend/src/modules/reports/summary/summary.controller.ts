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
    
    // Derived values
    const remainingLoa = (doc.loaQty || 0) - (doc.billedQty || 0);
    const remainingBom = (doc.bomQty || 0) - (doc.actQty || 0);
    const completionPercent = doc.loaQty ? ((doc.actQty || 0) / doc.loaQty) * 100 : 0;
    const variance = (doc.diQty || 0) - (doc.actQty || 0);
    const pendingInvoice = (doc.actQty || 0) - (doc.billedQty || 0);

    return {
      ...doc,
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
