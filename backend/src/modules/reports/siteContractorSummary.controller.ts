import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { 
  computeSiteContractorSummary, 
  clearSiteContractorSummaryCache 
} from './siteContractorSummary.service';

export { clearSiteContractorSummaryCache };

/**
 * GET /api/reports/site-contractor-summary
 * Track site progress, store issues, returns, WIP & JMC reconciliation for site contractors
 */
export const getSiteContractorSummary = asyncHandler(async (req: Request, res: Response) => {
  const { contractorId, package: pkg, circle } = req.query;

  const summaryData = await computeSiteContractorSummary({
    contractorId: contractorId as string,
    package: pkg as string,
    circle: circle as string
  });

  res.status(200).json(
    new ApiResponse(200, summaryData, 'Site contractor summary fetched successfully')
  );
});
