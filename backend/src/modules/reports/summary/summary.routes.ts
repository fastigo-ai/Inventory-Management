import { Router } from 'express';
import { 
  getSummaries, 
  getVendorSummary, 
  getContractorSummary, 
  getStoreSummary, 
  getStoreItemisedSummary,
  exportStoreItemisedSummary,
  getVendorDetails, 
  getContractorDetails, 
  getItemDetails 
} from './summary.controller';

const router = Router();

router.get('/item-summary', getSummaries);
router.get('/vendor-summary', getVendorSummary);
router.get('/contractor-summary', getContractorSummary);
router.get('/store-summary', getStoreSummary);
router.get('/store-itemised-summary', getStoreItemisedSummary);
router.get('/store-itemised-summary/export', exportStoreItemisedSummary);

router.get('/vendor-summary/:vendorName', getVendorDetails);
router.get('/contractor-summary/:contractorName', getContractorDetails);
router.get('/item-summary/:itemId', getItemDetails);

export default router;

