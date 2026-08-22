import { Router } from 'express';
import { 
  getSummaries, 
  getItemMatrixSummary,
  getVendorSummary,
  getVendorItemisedSummary,
  getContractorSummary, 
  getStoreSummary, 
  getStoreItemisedSummary,
  getStoreContractorSummary,
  exportStoreItemisedSummary,
  getVendorDetails, 
  getContractorDetails, 
  getItemDetails 
} from './summary.controller';

const router = Router();

router.get('/item-summary', getSummaries);
router.get('/item-matrix-summary', getItemMatrixSummary);
router.get('/vendor-summary', getVendorSummary);
router.get('/vendor-itemised-summary', getVendorItemisedSummary);
router.get('/contractor-summary', getContractorSummary);
router.get('/store-summary', getStoreSummary);
router.get('/store-itemised-summary', getStoreItemisedSummary);
router.get('/store-contractor-summary', getStoreContractorSummary);
router.get('/store-itemised-summary/export', exportStoreItemisedSummary);

router.get('/vendor-summary/:vendorName', getVendorDetails);
router.get('/contractor-summary/:contractorName', getContractorDetails);
router.get('/item-summary/:itemId', getItemDetails);

import { getSiteContractorSummary } from '../siteContractorSummary.controller';
router.get('/site-contractor-summary', getSiteContractorSummary);

export default router;

