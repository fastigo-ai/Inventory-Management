import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import { StoreInwardEntry } from './storeInwardEntry.schema';
import { DI } from '../di/di.schema';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
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

export const getPendingDIs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = { status: { $in: ['Active', 'Pending Receipt', 'Received'] } }; // Keeping old statuses temporarily for backward compatibility with existing DB entries
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) {
      const allowedCircles = expandCircle(user.assignedCircle) || [user.assignedCircle];
      filter.circle = { $in: allowedCircles };
    }
  }

  // Get all DIs matching the filter
  const dis = await DI.find(filter)
    .populate('purchaseOrderId', 'purchaseOrderNumber vendorName')
    .sort({ createdAt: 1 });

  // Filter out DIs that already have a SUBMITTED or VERIFIED inward entry
  const pendingDIs = [];
  for (const di of dis) {
    const existingEntry = await StoreInwardEntry.findOne({
      diId: di._id,
      status: { $in: ['SUBMITTED', 'VERIFIED'] }
    });
    if (!existingEntry) {
      pendingDIs.push(di);
    }
  }

  res.status(200).json(
    new ApiResponse(200, pendingDIs, 'Pending DIs fetched successfully')
  );
});

export const getPurchaseInvoicePrefillData = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  
  const invoice = await PurchaseInvoice.findById(invoiceId);
  if (!invoice) {
    throw new ApiError(404, 'Purchase Invoice not found');
  }

  let po = null;
  if (invoice.purchaseOrderId) {
    po = await PurchaseOrder.findById(invoice.purchaseOrderId);
  }

  const invoiceItem = invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems[0] : null;
  const poItem = po ? po.lineItems.find((li: any) => li.itemId?.toString() === invoiceItem?.itemId?.toString()) : null;

  let itemUnit = poItem?.unit || 'Nos';
  if (invoiceItem?.itemId) {
    const itemData = await Item.findById(invoiceItem.itemId);
    if (itemData && itemData.unit) {
      itemUnit = itemData.unit;
    }
  }

  const prefillData = {
    purchaseInvoiceId: invoice._id,
    purchaseOrderId: po?._id,
    poNumber: po?.purchaseOrderNumber || '',
    poDate: po?.date ? po.date : '',
    billingFrom: invoice.billingCompany?.name || po?.billingCompany?.name || '',
    vendorName: invoice.vendorName || po?.vendorName,
    itemName: invoiceItem?.itemName || poItem?.itemName || '',
    unit: itemUnit,
    invoiceQty: invoiceItem ? invoiceItem.quantity : 0,
    totalQty: poItem ? poItem.quantity : (invoiceItem ? invoiceItem.quantity : 0),
    rate: invoiceItem ? invoiceItem.rate : 0,
    amount: invoiceItem ? invoiceItem.amount : 0,
    taxableAmount: invoiceItem ? invoiceItem.amount : 0,
    hsnCode: invoiceItem?.hsnCode || poItem?.hsnCode || '',
    gst: invoice.cgstPercentage ? `${(invoice.cgstPercentage * 2)}%` : invoice.igstPercentage ? `${invoice.igstPercentage}%` : '',
    cgstRate: invoice.cgstPercentage || 0,
    sgstRate: invoice.sgstPercentage || 0,
    igstRate: invoice.igstPercentage || 0,
    cgst: (invoiceItem ? invoiceItem.amount : 0) * (invoice.cgstPercentage || 0) / 100,
    sgst: (invoiceItem ? invoiceItem.amount : 0) * (invoice.sgstPercentage || 0) / 100,
    igst: (invoiceItem ? invoiceItem.amount : 0) * (invoice.igstPercentage || 0) / 100,
    invoiceDate: invoice.date ? invoice.date : '',
    diRefNo: '',
    circle: '',
    package: '',
    serialNumber: poItem?.loaSerialNo || invoiceItem?.itemName || '',
    matchedInvoiceNumber: invoice.invoiceNumber,
    matchedInvoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber
  };

  res.status(200).json(
    new ApiResponse(200, prefillData, 'Prefill data fetched successfully')
  );
});

export const getDIPrefillData = asyncHandler(async (req: Request, res: Response) => {
  const { diId } = req.params;
  
  const di = await DI.findById(diId);
  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  const po = di.purchaseOrderId ? await PurchaseOrder.findById(di.purchaseOrderId) : null;
  // If no PO is linked, we just proceed with what we have in DI.

  // Find if there's any matching Purchase Invoice for this PO (only if PO exists)
  const invoice = po ? await PurchaseInvoice.findOne({ purchaseOrderId: po._id }).sort({ createdAt: 1 }) : null;

  // Get the first item from DI to map properties (assuming 1 item per DI typically, or sum them)
  const item = di.lineItems[0];
  const poItem = po ? po.lineItems.find((li: any) => li.itemId?.toString() === item?.itemId?.toString() || li.tempCode === item?.tempCode) : null;
  const invoiceItem = invoice?.lineItems?.find((li: any) => li.itemId?.toString() === item?.itemId?.toString());

  const prefillData = {
    diId: di._id,
    purchaseOrderId: po?._id || null,
    poNumber: po?.purchaseOrderNumber || di.poNumber || '',
    poDate: po?.date || '',
    billingFrom: po?.billingCompany?.name || '',
    vendorName: po?.vendorName || di.vendorName || '',
    unit: poItem?.unit || item?.unit || 'Nos',
    invoiceQty: invoiceItem ? invoiceItem.quantity : (item?.quantity || poItem?.quantity || 0),
    totalQty: poItem?.quantity || item?.quantity || 0,
    rate: invoiceItem ? invoiceItem.rate : (poItem?.rate || 0),
    amount: invoiceItem ? invoiceItem.amount : (poItem?.amount || 0),
    taxableAmount: invoiceItem ? invoiceItem.amount : (poItem?.amount || 0),
    hsnCode: invoiceItem ? invoiceItem.hsnCode : (poItem?.hsnCode || ''),
    gst: po ? (po.cgstPercentage ? `${(po.cgstPercentage * 2)}%` : po.igstPercentage ? `${po.igstPercentage}%` : '') : '0%',
    cgst: po?.cgstPercentage || 0,
    sgst: po?.sgstPercentage || 0,
    igst: po?.igstPercentage || 0,
    invoiceDate: invoice?.date || '',
    diRefNo: di.diNumber, // Usually DI number is the ref no
    circle: di.circle,
    package: di.package,
    serialNumber: poItem?.loaSerialNo || item?.tempCode || '',
    matchedInvoiceNumber: invoice?.invoiceNumber || null,
    matchedInvoiceId: invoice?._id || null,
    itemName: item?.itemName || '',
    tempCode: item?.tempCode || ''
  };

  res.status(200).json(
    new ApiResponse(200, prefillData, 'Prefill data fetched successfully')
  );
});

export const createInwardEntry = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  
  if (!data.diId && !data.purchaseInvoiceId) {
    throw new ApiError(400, 'DI ID or Purchase Invoice ID is required');
  }

  // Enforce 1 active inward entry per PI + tempCode combination
  // (A single PI can have multiple line items/tempCodes, each needing their own GRN)
  const existingFilter: any = { status: { $ne: 'DRAFT' } };
  if (data.purchaseInvoiceId) {
    existingFilter.purchaseInvoiceId = data.purchaseInvoiceId;
    if (data.tempCode) existingFilter.tempCode = data.tempCode;
  } else {
    existingFilter.diId = data.diId;
    if (data.tempCode) existingFilter.tempCode = data.tempCode;
  }

  const existing = await StoreInwardEntry.findOne(existingFilter);

  if (existing) {
    throw new ApiError(400, `A submitted Inward Entry already exists for this Invoice/DI and item (TempCode: ${data.tempCode || 'unknown'})`);
  }

  // Truck number validation
  if (data.truckNumber) {
    const truckRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/i;
    if (!truckRegex.test(data.truckNumber.replace(/[\s-]/g, ''))) {
      throw new ApiError(400, 'Invalid Truck Number format');
    }
  }

  // Packing list validation
  if (data.status === 'SUBMITTED') {
    if (!data.packingList || data.packingList.length === 0) {
      throw new ApiError(400, 'Packing list must contain at least one item to submit');
    }
    let totalPackQty = 0;
    data.packingList.forEach((pack: any) => {
      totalPackQty += Number(pack.quantity) || 0;
    });
    if (totalPackQty === 0) {
      throw new ApiError(400, 'Sum of packing list quantities must be > 0 to submit');
    }
    
    // Auto-approve upon submission
    data.status = 'APPROVED';
  }

  // If a Purchase Invoice matches another PO
  if (data.invoiceNumber) {
    const invoiceMatch = await PurchaseInvoice.findOne({ invoiceNumber: data.invoiceNumber });
    if (invoiceMatch && invoiceMatch.purchaseOrderId?.toString() !== data.purchaseOrderId?.toString()) {
      throw new ApiError(400, 'This Invoice Number belongs to a different Purchase Order');
    }
    if (invoiceMatch) {
      data.purchaseInvoiceId = invoiceMatch._id;
    }
  }

  // If DRAFT, upsert based on PI/DI + tempCode so each line item gets its own draft
  const draftFilter: any = { status: 'DRAFT' };
  if (data.purchaseInvoiceId) {
    draftFilter.purchaseInvoiceId = data.purchaseInvoiceId;
    if (data.tempCode) draftFilter.tempCode = data.tempCode;
  } else {
    draftFilter.diId = data.diId;
    if (data.tempCode) draftFilter.tempCode = data.tempCode;
  }
  let entry = await StoreInwardEntry.findOne(draftFilter);
  
  data.createdBy = (req as any).user?._id;
  
  if (!data.inwardId) {
    data.inwardId = `INW-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  if (entry) {
    // If it's being updated, we should really sync it, but since it's a DRAFT upsert it's fine.
    // If quantities change, pendingMhrovQty might need recalculation.
    // Assuming DRAFTs don't have MHROVs yet.
    if (entry.status === 'DRAFT') {
      data.pendingMhrovQty = Number(data.totalQty || data.invoiceQty || data.challanQty || 0);
    }
    entry = await StoreInwardEntry.findByIdAndUpdate(entry._id, data, { new: true });
  } else {
    data.mhrovDoneQty = 0;
    data.pendingMhrovQty = Number(data.totalQty || data.invoiceQty || data.challanQty || 0);
    data.mhrovStatus = 'PENDING';
    entry = await StoreInwardEntry.create(data);
  }

  // If status is APPROVED (auto-approved from SUBMITTED), update stock
  if (data.status === 'APPROVED') {
    await processInwardStockUpdate(entry._id.toString());
  }

  res.status(201).json(
    new ApiResponse(201, entry, 'Store Inward Entry saved successfully')
  );
});



export const getInwardEntryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const entry = await StoreInwardEntry.findById(id)
    .populate('itemId')
    .populate('diId')
    .populate('purchaseOrderId')
    .populate('purchaseInvoiceId')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

  if (!entry) {
    throw new ApiError(404, 'Entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, entry, 'Entry fetched successfully')
  );
});

export const queryInwardEntries = asyncHandler(async (req: Request, res: Response) => {
  const { diId, status, diNo, vendor, invoiceNo, dateFrom, dateTo, itemName, page = 1, limit = 50, excludeMhrovId, forMhrov, circle } = req.query;
  const filter: any = {};
  
  if (circle) filter.circle = circle;
  if (diId) filter.diId = diId;
  else if (forMhrov === 'true' || String(forMhrov) === 'true' || forMhrov === undefined) {
    // Only show items that have a DI assigned (either by ID or string ref)
    filter.$or = [
      { diId: { $exists: true, $ne: null } },
      { diRefNo: { $exists: true, $nin: ['', null] } }
    ];
  }
  if (status) filter.status = status;
  
  if (diNo && diNo !== 'all') filter.diRefNo = diNo;
  if (vendor && vendor !== 'all') filter.vendorName = vendor;
  if (invoiceNo && invoiceNo !== 'all') filter.invoiceNumber = invoiceNo;
  if (itemName) filter.itemName = { $regex: itemName, $options: 'i' };
  
  if (dateFrom || dateTo) {
    filter.invoiceDate = {};
    if (dateFrom) filter.invoiceDate.$gte = new Date(dateFrom as string);
    if (dateTo) filter.invoiceDate.$lte = new Date(dateTo as string);
  }
  
  // Find all existing MHROVs to compute already completed quantities
  const mhrovFilter: any = {};
  if (excludeMhrovId) {
    mhrovFilter._id = { $ne: new mongoose.Types.ObjectId(excludeMhrovId as string) };
  }
  const existingMhrovs = await Mhrov.find(mhrovFilter).lean();

  const doneQtyMap = new Map<string, number>();
  existingMhrovs.forEach((m: any) => {
    if (m.items && Array.isArray(m.items) && m.items.length > 0) {
      m.items.forEach((it: any) => {
        const idStr = it.inwardEntryId?.toString();
        if (idStr) {
          doneQtyMap.set(idStr, (doneQtyMap.get(idStr) || 0) + Number(it.mhrovDoneQty || 0));
        }
      });
    } else if (m.inwardEntries && Array.isArray(m.inwardEntries)) {
      m.inwardEntries.forEach((id: any) => {
        const idStr = id?.toString();
        if (idStr) {
          doneQtyMap.set(idStr, doneQtyMap.get(idStr) || 0);
        }
      });
    }
  });

  const allEntries = await StoreInwardEntry.find(filter)
    .populate('diId', 'diNumber lineItems')
    .populate('itemId')
    .sort({ createdAt: 1 })
    .lean();

  // Attach remainingQty and doneQty
  let entriesWithRemaining = allEntries.map(entry => {
    const doneQty = doneQtyMap.get(entry._id.toString()) || 0;
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
    const totalQty = diQty > 0 ? diQty : Number(entry.totalQty || entry.invoiceQty || 0);
    const remainingQty = Math.max(0, totalQty - doneQty);
    
    // Extract Item details
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
           // Fallback to sum of all matching circles if package is missing or mismatch
           const matchingCircles = dd.stockLocations.filter((l: any) => l.circle?.toLowerCase() === targetCircle.toLowerCase());
           balanceInStock = matchingCircles.reduce((sum: number, l: any) => sum + Number(l.quantity || 0), 0);
        }
      }
    }
    
    return {
      ...entry,
      doneQty,
      remainingQty,
      loaSrNo,
      tempCode,
      totalLoaQty,
      circleLoaQty,
      balanceInStock
    };
  });

  // Filter out exhausted items when querying for MHROV
  if (forMhrov === 'true' || String(forMhrov) === 'true' || forMhrov === undefined) {
    entriesWithRemaining = entriesWithRemaining.filter(e => e.remainingQty > 0);
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 50;
  const total = entriesWithRemaining.length;
  const skip = (pageNum - 1) * limitNum;
  const paginatedEntries = entriesWithRemaining.slice(skip, skip + limitNum);

  res.status(200).json(
    new ApiResponse(200, {
      entries: paginatedEntries,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      limit: limitNum
    }, 'Entries fetched successfully')
  );
});

export const getInwardFilterOptions = asyncHandler(async (req: Request, res: Response) => {
  const validDiFilter = { $or: [{ diId: { $exists: true, $ne: null } }, { diRefNo: { $exists: true, $nin: ['', null] } }] };
  const [storeDiNos, allDIs, vendors, invoiceNos] = await Promise.all([
    StoreInwardEntry.distinct('diRefNo', validDiFilter),
    mongoose.model('DI').distinct('diNumber'),
    StoreInwardEntry.distinct('vendorName', validDiFilter),
    StoreInwardEntry.distinct('invoiceNumber', validDiFilter)
  ]);
  const diNos = Array.from(new Set([...storeDiNos, ...allDIs]));

  res.status(200).json(
    new ApiResponse(200, {
      diNos: diNos.filter(Boolean),
      vendors: vendors.filter(Boolean),
      invoiceNos: invoiceNos.filter(Boolean)
    }, 'Filter options fetched successfully')
  );
});

// ==========================================
// NEW API: Filter Options for MHROV DI Search
// ==========================================
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
export const getAdminInwardEntries = asyncHandler(async (req: Request, res: Response) => {
  const { circle, status, vendorName, poNumber } = req.query;
  const filter: any = {};
  
  if (circle) filter.circle = circle;
  if (status) filter.status = status;
  if (vendorName) filter.vendorName = { $regex: vendorName, $options: 'i' };
  if (poNumber) filter.poNumber = { $regex: poNumber, $options: 'i' };

  // Only show submitted/verified ones to admin, unless explicitly asking for drafts
  if (!status) {
    filter.status = { $ne: 'DRAFT' };
  }

  const entries = await StoreInwardEntry.find(filter)
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: 1 });

  res.status(200).json(
    new ApiResponse(200, entries, 'Admin entries fetched successfully')
  );
});

export async function buildStockSummaryData(circleFilter?: string, packageFilter?: string, contractorId?: string) {
  // Build filters for Inward, Assignments, Returns
  const inwardFilter: any = { status: { $in: ['VERIFIED', 'APPROVED'] } };
  if (circleFilter) inwardFilter.circle = { $regex: new RegExp(`^${circleFilter}$`, 'i') };
  if (packageFilter) inwardFilter.package = packageFilter;

  const assignmentFilter: any = { status: 'Sent' };
  if (contractorId) assignmentFilter.contractorId = contractorId;
  if (circleFilter) {
    assignmentFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } }
    ];
  }

  const returnsFilter: any = { status: 'Submitted' };
  if (contractorId) returnsFilter.contractorId = contractorId;
  if (circleFilter) {
    returnsFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } }
    ];
  }

  const wipJmcFilter: any = { status: { $ne: 'Rejected' } };
  if (contractorId) wipJmcFilter.contractorId = contractorId;
  if (circleFilter) {
    wipJmcFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } }
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
    jmcRecords
  ] = await Promise.all([
    Item.find({ isDeleted: false }).lean(),
    StoreInwardEntry.find(inwardFilter).lean(),
    ContractorAssignment.find(assignmentFilter).lean(),
    ContractorReturn.find(returnsFilter).lean(),
    StoreTransfer.find({ status: 'RECEIVED' }).lean(),
    WipRegister.find(wipJmcFilter).lean(),
    JmcRegister.find(wipJmcFilter).lean()
  ]);
  console.log("Fetched all DB collections successfully!");

  // 5. Aggregate data per item
  const summaryMap: Record<string, any> = {};

  items.forEach(item => {
    const data = item.dynamicData || {};
    const tempCode = data.tempCode || data.temp_code || '';
    const activity = data.activity || data.itemActivity || 'Uncategorized Activity';
    const loaSrNo = data.loaSrNo || data.loaSerialNo || data.loaSerialNumber || data.sku || '';
    
    summaryMap[tempCode] = {
      itemId: item._id,
      sr: 0,
      tempCode: tempCode,
      activity: activity,
      hsnCode: data.hsnCode || data.hsn_code || '-',
      description: data.name || data.description || '-',
      unit: data.unit || 'Nos',
      loaSrNo: loaSrNo,
      challanQty: 0,
      receivedQty: 0,
      rejectedQty: 0,
      acceptedQty: 0,
      receivedFromOtherStore: 0,
      totalInStockAfterReceive: 0,
      transferToOtherStore: 0,
      contractorsIssuedQty: 0,
      contractorsReturnQty: 0,
      contractorsActualIssued: 0,
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

  // Calculate Contractor Assignments
  assignments.forEach(assignment => {
    assignment.lineItems?.forEach((line: any) => {
      const tc = line.tempCode || '';
      if (summaryMap[tc]) {
        summaryMap[tc].contractorsIssuedQty += (line.quantity || 0);
      }
    });
  });

  // Calculate Contractor Returns
  contractorReturns.forEach(ret => {
    ret.lineItems?.forEach((line: any) => {
      const tc = line.tempCode || '';
      if (summaryMap[tc]) {
        summaryMap[tc].contractorsReturnQty += (line.quantity || 0);
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
    row.totalBalanceQty = row.totalInStockAfterReceive - row.transferToOtherStore - row.contractorsActualIssued;
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

export const getStockSummary = asyncHandler(async (req: Request, res: Response) => {
  const { circle, package: pkg, contractorId } = req.query;
  const summary = await buildStockSummaryData(circle as string, pkg as string, contractorId as string);
  res.status(200).json(new ApiResponse(200, summary, 'Stock summary fetched successfully'));
});

export const getAdminStockSummary = asyncHandler(async (req: Request, res: Response) => {
  const { circle, package: pkg, contractorId } = req.query;
  const summary = await buildStockSummaryData(circle as string, pkg as string, contractorId as string);
  res.status(200).json(new ApiResponse(200, summary, 'Admin stock summary fetched successfully'));
});

export const createStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transferData = req.body;
  transferData.requestedBy = (req as any).user?._id;
  
  const transfer = await StoreTransfer.create(transferData);
  res.status(201).json(new ApiResponse(201, transfer, 'Transfer request created successfully'));
});

export const getStoreTransfers = asyncHandler(async (req: Request, res: Response) => {
  const { circle, registerType } = req.query;
  const user = (req as any).user;
  
  let filter: any = {};

  const storeNameRaw = circle || (user && user.role?.name === 'Store Manager' ? user.assignedCircle : '');
  const cleanStoreName = storeNameRaw ? String(storeNameRaw).replace(/store/i, '').trim() : '';
  const expandedStoreNames = expandCircle(cleanStoreName) || [cleanStoreName];
  if (cleanStoreName) {
    const storeRegex = new RegExp(`^(${expandedStoreNames.join('|')})$`, 'i');
    if (registerType === 'OUTWARD') {
      filter.fromStore = storeRegex;
      filter.registerType = 'OUTWARD';
    } else if (registerType === 'INWARD') {
      filter.toStore = storeRegex;
      filter.registerType = 'INWARD';
    } else {
      filter.$or = [{ fromStore: storeRegex }, { toStore: storeRegex }];
    }
  } else {
    if (registerType) {
      filter.registerType = registerType;
    }
  }

  const transfers = await StoreTransfer.find(filter)
    .populate('requestedBy', 'firstName lastName email')
    .populate('items.itemId')
    .sort({ createdAt: 1 })
    .lean();

  const formattedTransfers = transfers.map((t: any) => {
    const circle = t.fromStore || t.toStore || cleanStoreName || 'Nahan';
    const cStr = circle.toLowerCase().replace(/store|circle/gi, '').trim();

    t.items = (t.items || []).map((item: any) => {
      const itemDynamic = item.itemId?.dynamicData || {};
      
      if (!item.loaSerialNo || item.loaSerialNo === '-' || item.loaSerialNo === '') {
        item.loaSerialNo = itemDynamic.sku || itemDynamic.loaSerialNo || itemDynamic.loaSrNo || itemDynamic.srNo || itemDynamic['LOA Serial No'] || itemDynamic['LOA Sr. No.'] || '-';
      }

      if (item.loaQty === undefined || item.loaQty === null || item.loaQty === '-') {
        if (cStr && itemDynamic[`${cStr}LoaQuantity`]) {
          item.loaQty = Number(itemDynamic[`${cStr}LoaQuantity`]);
        } else if (itemDynamic.loaQuantity !== undefined && itemDynamic.loaQuantity !== '') {
          item.loaQty = Number(itemDynamic.loaQuantity);
        } else if (itemDynamic.nahanLoaQuantity) {
          item.loaQty = Number(itemDynamic.nahanLoaQuantity);
        } else if (itemDynamic.solanLoaQuantity) {
          item.loaQty = Number(itemDynamic.solanLoaQuantity);
        } else if (itemDynamic.rampurLoaQuantity) {
          item.loaQty = Number(itemDynamic.rampurLoaQuantity);
        } else if (itemDynamic.rohruLoaQuantity) {
          item.loaQty = Number(itemDynamic.rohruLoaQuantity);
        } else if (itemDynamic.circleLoaQuantity) {
          item.loaQty = Number(itemDynamic.circleLoaQuantity);
        }
      }

      return item;
    });

    return t;
  });

  res.status(200).json(new ApiResponse(200, formattedTransfers, 'Transfers fetched successfully'));
});

export const getStoreTransferById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const transfer = await StoreTransfer.findById(id).populate('requestedBy', 'firstName lastName email');
  if (!transfer) throw new ApiError(404, 'Transfer not found');
  res.status(200).json(new ApiResponse(200, transfer, 'Transfer fetched successfully'));
});

export const updateStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role?.name === "Admin" || user?.role?.name === "Super Admin" || user?.role?.permissions?.includes("*");
  const payload = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StoreTransfer.findById(id).session(session);
    if (!transfer) {
      throw new ApiError(404, 'Transfer not found');
    }

    if (transfer.status !== 'PENDING') {
      if (!isAdmin) {
        throw new ApiError(403, 'Only Admins can edit transfers that have already been dispatched or received.');
      }
    } else {
      if (!isAdmin && user.assignedCircle && user.assignedCircle !== transfer.fromStore) {
        throw new ApiError(403, 'You can only edit transfers originating from your assigned store.');
      }
    }

    Object.assign(transfer, payload);
    const updated = await transfer.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json(new ApiResponse(200, updated, 'Transfer updated successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const deleteStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role?.name === "Admin" || user?.role?.name === "Super Admin" || user?.role?.permissions?.includes("*");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await StoreTransfer.findById(id).session(session);
    if (!transfer) {
      throw new ApiError(404, 'Transfer not found');
    }

    if (transfer.status !== 'PENDING') {
      if (!isAdmin) {
        throw new ApiError(403, 'Only Admins can delete transfers that have already been dispatched or received.');
      }
    } else {
      if (!isAdmin && user.assignedCircle && user.assignedCircle !== transfer.fromStore) {
        throw new ApiError(403, 'You can only delete transfers originating from your assigned store.');
      }
    }

    await StoreTransfer.findByIdAndDelete(id).session(session);
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json(new ApiResponse(200, null, 'Transfer deleted successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const updateStoreTransferStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const transfer = await StoreTransfer.findByIdAndUpdate(id, { status }, { new: true });
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  res.status(200).json(new ApiResponse(200, transfer, 'Transfer status updated successfully'));
});

export const dispatchStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const dispatchData = req.body;

  dispatchData.status = 'IN_TRANSIT';

  const transfer = await StoreTransfer.findByIdAndUpdate(id, dispatchData, { new: true });
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  res.status(200).json(new ApiResponse(200, transfer, 'Transfer dispatched successfully'));
});

export const receiveStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Expected updateData includes `items` (with receivedQty)
  updateData.status = 'RECEIVED';

  const transfer = await StoreTransfer.findByIdAndUpdate(id, updateData, { new: true });
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }

  res.status(200).json(new ApiResponse(200, transfer, 'Transfer received successfully'));
});


export const importInwardRegistrations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);
  
  const rawRows: any[] = [];
  for await (const row of parser) {
    rawRows.push(row);
  }

  const errors: string[] = [];
  const validPayloads: any[] = [];
  
  // Pass 1: Validate everything
  for (const row of rawRows) {
    try {
      const invoiceNumber = row['InvoiceNumber'] || row['Invoice Number'] || row['invoiceNumber'];
      if (!invoiceNumber) {
        errors.push(`Row missing Invoice Number`);
        continue;
      }

      const invoice = await PurchaseInvoice.findOne({ invoiceNumber });
      if (!invoice) {
        errors.push(`Invoice not found: ${invoiceNumber}`);
        continue;
      }
      
      if (invoice.status !== 'Pending Receipt' && invoice.status !== 'Partially Received') {
        errors.push(`Invoice ${invoiceNumber} is not pending receipt.`);
        continue;
      }

      let po = null;
      if (invoice.purchaseOrderId) {
        po = await PurchaseOrder.findById(invoice.purchaseOrderId);
      }

      const loaSerialNo = row['LoaSerialNo'] || row['loaSerialNo'] || row['LOA Serial No'];
      const itemName = row['ItemName'] || row['itemName'] || row['Item Name'];

      let invoiceItem = null;
      if (loaSerialNo) {
        invoiceItem = invoice.lineItems.find((li: any) => li.itemName === itemName);
      }
      
      if (!invoiceItem && invoice.lineItems.length === 1) {
        invoiceItem = invoice.lineItems[0];
      }

      if (!invoiceItem && itemName) {
         invoiceItem = invoice.lineItems.find((li: any) => li.itemName?.toLowerCase().includes(itemName.toLowerCase()));
      }

      if (!invoiceItem) {
        errors.push(`Item '${itemName || loaSerialNo}' not found in Invoice ${invoiceNumber}`);
        continue;
      }

      const poItem = po ? po.lineItems.find((li: any) => li.itemId?.toString() === invoiceItem?.itemId?.toString()) : null;

      let itemUnit = poItem?.unit || 'Nos';
      if (invoiceItem.itemId) {
        const itemData = await Item.findById(invoiceItem.itemId);
        if (itemData && itemData.unit) {
          itemUnit = itemData.unit;
        }
      }
      
      const challanQty = Number(row['ChallanQty'] || row['challanQty'] || 0);
      const rejectedQty = Number(row['RejectedQty'] || row['rejectedQty'] || 0);
      const acceptedQty = Number(row['AcceptedQty'] || row['acceptedQty'] || row['ReceivedQty'] || 0);
      
      if (acceptedQty < 0) {
        errors.push(`Accepted Qty cannot be negative for Invoice ${invoiceNumber}`);
        continue;
      }

      const rate = row['Rate'] !== undefined && row['Rate'] !== '' ? Number(row['Rate']) : (invoiceItem.rate || 0);
      
      let taxableAmount = 0;
      if (row['TaxableAmount'] !== undefined && row['TaxableAmount'] !== '') {
        taxableAmount = Number(row['TaxableAmount']);
      } else {
        taxableAmount = acceptedQty * rate;
      }
      
      const cgstRate = invoice.cgstPercentage || 0;
      const sgstRate = invoice.sgstPercentage || 0;
      const igstRate = invoice.igstPercentage || 0;
      
      const cgst = row['Cgst'] !== undefined && row['Cgst'] !== '' ? Number(row['Cgst']) : (taxableAmount * cgstRate) / 100;
      const sgst = row['Sgst'] !== undefined && row['Sgst'] !== '' ? Number(row['Sgst']) : (taxableAmount * sgstRate) / 100;
      const igst = row['Igst'] !== undefined && row['Igst'] !== '' ? Number(row['Igst']) : (taxableAmount * igstRate) / 100;
      
      const amount = row['Amount'] !== undefined && row['Amount'] !== '' ? Number(row['Amount']) : (taxableAmount + cgst + sgst + igst);

      validPayloads.push({
        inwardId: row['InwardId'] || row['Inward ID'] || row['inwardId'] || `INW-${Math.floor(10000 + Math.random() * 90000)}`,
        purchaseInvoiceId: invoice._id,
        purchaseOrderId: po?._id,
        poNumber: row['PoNumber'] || po?.purchaseOrderNumber || '',
        poDate: row['PoDate'] ? new Date(row['PoDate']) : po?.date,
        billingFrom: row['BillingFrom'] || invoice.billingCompany?.name || po?.billingCompany?.name || '',
        vendorName: row['VendorName'] || invoice.vendorName || po?.vendorName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: row['InvoiceDate'] ? new Date(row['InvoiceDate']) : invoice.date,
        receivedDate: row['ReceivedDate'] ? new Date(row['ReceivedDate']) : new Date(),
        unit: row['Unit'] || itemUnit,
        invoiceQty: row['InvoiceQty'] !== undefined && row['InvoiceQty'] !== '' ? Number(row['InvoiceQty']) : acceptedQty,
        totalQty: row['TotalQty'] !== undefined && row['TotalQty'] !== '' ? Number(row['TotalQty']) : (poItem ? poItem.quantity : invoiceItem.quantity),
        challanQty: challanQty,
        rejectedQty: rejectedQty,
        acceptedQty: acceptedQty,
        receivedQty: acceptedQty,
        rate: rate,
        amount: amount,
        taxableAmount: taxableAmount,
        tempCode: row['TempCode'] || undefined, 
        itemName: row['ItemName'] || invoiceItem.itemName || '',
        itemDescription: row['ItemDescription'] || invoiceItem.description || poItem?.description || '',
        hsnCode: row['HsnCode'] || invoiceItem.hsnCode || poItem?.hsnCode || '',
        challanNumber: row['ChallanNumber'] || '',
        transportName: row['TransportName'] || '',
        truckNumber: row['TruckNumber'] || '',
        grNumber: row['GrNumber'] || '',
        grDate: row['GrDate'] ? new Date(row['GrDate']) : undefined,
        biltyNumber: row['BiltyNumber'] || '',
        gst: row['Gst'] || (invoice.cgstPercentage ? `${(invoice.cgstPercentage * 2)}%` : invoice.igstPercentage ? `${invoice.igstPercentage}%` : ''),
        cgst: cgst,
        sgst: sgst,
        igst: igst,
        diRefNo: row['DiRefNo'] || '',
        remarks: row['Remarks'] || '',
        circle: row['Circle'] || invoiceItem.circle || poItem?.circle || '',
        subcircle: row['Subcircle'] || invoiceItem.subcircle || poItem?.subcircle || '',
        package: row['Package'] || invoiceItem.package || poItem?.package || '',
        serialNumber: row['SerialNumber'] || loaSerialNo || poItem?.loaSerialNo || invoiceItem.itemName,
        status: 'DRAFT',
        packingList: [],
        createdBy: (req as any).user?._id
      });
    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row validation errors. No data was imported.')
    );
  }

  // Pass 2: Save Data
  let successCount = 0;
  for (const payload of validPayloads) {
    try {
      const draftFilter: any = { 
        status: 'DRAFT',
        purchaseInvoiceId: payload.purchaseInvoiceId,
        serialNumber: payload.serialNumber
      };
      
      let entry = await StoreInwardEntry.findOne(draftFilter);
      if (entry) {
        await StoreInwardEntry.findByIdAndUpdate(entry._id, payload);
      } else {
        await StoreInwardEntry.create([payload]);
      }
      successCount++;
    } catch (err: any) {
      // Very rare unless DB issues during save
      console.error('Failed to save inward entry:', err);
    }
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed successfully')
  );
});

export const getStoreReceiptFilterOptions = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const baseFilter: any = { purchaseInvoiceId: { $exists: true } };

  // Scope filter to assigned package/circle/subcircle for Store Managers
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      baseFilter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    if (user.assignedCircle) {
      baseFilter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };
    }
    if (user.assignedSubcircle) {
      baseFilter.subcircle = { $regex: new RegExp(`^\\s*${user.assignedSubcircle.trim()}\\s*$`, 'i') };
    }
  }

  const [packages, circles, vendors] = await Promise.all([
    StoreInwardEntry.distinct('package', baseFilter),
    StoreInwardEntry.distinct('circle', baseFilter),
    StoreInwardEntry.distinct('vendorName', baseFilter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      packages: packages.filter(Boolean).sort(),
      circles: circles.filter(Boolean).sort(),
      vendors: vendors.filter(Boolean).sort(),
    }, 'Filter options fetched')
  );
});

export const getPendingStoreReceipts = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { 
    page = '1', limit = '10', search, 
    package: pkg, circle, status, vendor, 
    invoicePo, dateRange, itemTemp, discrepancy,
    export: exportAll
  } = req.query;
  
  const filter: any = { status: { $in: ['PENDING_RECEIPT', 'APPROVED'] }, purchaseInvoiceId: { $exists: true } };
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    if (user.assignedCircle) {
      filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };
    }
    if (user.assignedSubcircle) {
      filter.subcircle = { $regex: new RegExp(`^\\s*${user.assignedSubcircle.trim()}\\s*$`, 'i') };
    }
  } else if (user && (user.role?.name === 'Admin' || user.role?.name === 'Super Admin' || user.role?.permissions?.includes('*'))) {
    if (pkg && pkg !== 'All') filter.package = pkg;
    if (circle && circle !== 'All') filter.circle = circle;
  }

  if (status && status !== 'All') {
    filter.status = status;
  }

  if (vendor && vendor !== 'All') {
    filter.vendorName = { $regex: vendor as string, $options: 'i' };
  }

  if (invoicePo) {
    const searchStr = invoicePo as string;
    filter.$or = filter.$or || [];
    if (/^\d+$/.test(searchStr)) {
      filter.$or.push(
        { invoiceNumber: searchStr },
        { poNumber: searchStr }
      );
    } else {
      filter.$or.push(
        { invoiceNumber: { $regex: searchStr, $options: 'i' } },
        { poNumber: { $regex: searchStr, $options: 'i' } }
      );
    }
  }

  if (itemTemp) {
    const searchStr = itemTemp as string;
    filter.$or = filter.$or || [];
    filter.$or.push(
      { itemName: { $regex: searchStr, $options: 'i' } },
      { tempCode: searchStr }
    );
  }

  if (discrepancy === 'Quantity Mismatch') {
    filter.$expr = {
      $lt: [
        { $ifNull: [ "$receivedQty", { $ifNull: [ "$challanQty", 0 ] } ] },
        "$invoiceQty"
      ]
    };
  }

  if (dateRange && dateRange !== 'All') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Copy today so we don't mutate it for 'This Week' calculations
    const todayCopy = new Date(today);

    if (dateRange === 'Today') {
      filter.invoiceDate = { $gte: today, $lt: tomorrow };
    } else if (dateRange === 'This Week') {
      const firstDay = new Date(todayCopy.setDate(todayCopy.getDate() - todayCopy.getDay()));
      filter.invoiceDate = { $gte: firstDay, $lt: tomorrow };
    } else if (dateRange === 'This Month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      filter.invoiceDate = { $gte: firstDay, $lt: tomorrow };
    }
  }

  if (search) {
    filter.$or = filter.$or || [];
    filter.$or.push({ inwardId: { $regex: search as string, $options: 'i' } });
  }

  console.log("DEBUG getPendingStoreReceipts query filter:", JSON.stringify(filter, null, 2));

  let query = StoreInwardEntry.find(filter)
    .populate('purchaseInvoiceId')
    .sort({ createdAt: 1 });

  if (exportAll !== 'true') {
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const [entries, total] = await Promise.all([
    query,
    StoreInwardEntry.countDocuments(filter)
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      entries,
      total,
      page: exportAll === 'true' ? 1 : parseInt(page as string, 10),
      totalPages: exportAll === 'true' ? 1 : Math.ceil(total / parseInt(limit as string, 10))
    }, 'Pending store receipts fetched successfully')
  );
});

export const getInwardRegister = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
  const { status } = req.query;
  
  const filter: any = { 
    purchaseInvoiceId: { $exists: true } 
  };

  if (status === 'PENDING_RECEIPT') {
    filter.status = 'PENDING_RECEIPT';
  } else if (status === 'APPROVED') {
    filter.status = { $in: ['APPROVED', 'VERIFIED', 'INWARDED', 'SUBMITTED'] };
  } else {
    filter.status = { $in: ['PENDING_RECEIPT', 'APPROVED', 'VERIFIED', 'INWARDED', 'SUBMITTED'] };
  }
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    if (user.assignedCircle) {
      filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };
    }
  }

  if (req.query.search) {
    const q = req.query.search as string;
    if (/^\d+$/.test(q)) {
      filter.inwardId = q;
    } else {
      filter.inwardId = { $regex: q, $options: 'i' };
    }
  }

  const entries = await StoreInwardEntry.find(filter)
    .populate('purchaseInvoiceId')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, {
      entries
    }, 'Inward register fetched successfully')
  );
});

export const approveStoreReceipt = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const entry = await StoreInwardEntry.findById(id);
  if (!entry) {
    return res.status(404).json(new ApiResponse(404, null, 'Store Inward Entry not found'));
  }
  
  if (entry.status !== 'PENDING_RECEIPT') {
    return res.status(400).json(new ApiResponse(400, null, 'Entry is not pending receipt'));
  }

  entry.status = 'APPROVED';
  await entry.save();
  
  // Also process inward stock update since we are moving it to APPROVED state
  await processInwardStockUpdate(entry._id.toString());
  
  res.status(200).json(
    new ApiResponse(200, entry, 'Store receipt approved successfully')
  );
});

export const updateInwardEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role?.name === "Admin" || user?.role?.name === "Super Admin" || user?.role?.permissions?.includes("*");
  const payload = req.body;
  const auditReason = req.body.auditReason;

  const entry = await StoreInwardEntry.findById(id);
  if (!entry) throw new ApiError(404, 'Store Inward Entry not found');
  if (entry.status === 'VOIDED') throw new ApiError(400, 'Cannot edit a voided entry.');

  const originalStatus = entry.status;

  if (entry.status === 'APPROVED' || entry.status === 'VERIFIED') {
    if (!isAdmin) {
      throw new ApiError(403, 'Store Managers cannot edit approved entries. Please request an Admin.');
    }
    if (!auditReason) {
      throw new ApiError(400, 'Audit reason is required when editing an approved entry.');
    }
    
    // Check downstream consumption stock check
    const summary = await buildStockSummaryData();
    const itemStock = summary[entry.tempCode || ''];
    if (itemStock) {
      // Calculate drop in received quantity
      const oldPackingQty = entry.packingList?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0;
      const newPackingQty = payload.packingList?.reduce((sum: number, p: any) => sum + p.quantity, 0) || oldPackingQty;
      const qtyDiff = oldPackingQty - newPackingQty;
      
      if (qtyDiff > 0 && itemStock.totalBalanceQty < qtyDiff) {
        throw new ApiError(409, `Conflict: Cannot reduce stock by ${qtyDiff}. Only ${itemStock.totalBalanceQty} available. Line items may have already been issued.`);
      }
    }
    
    if (!entry.auditLogs) entry.auditLogs = [];
    entry.auditLogs.push({
      action: 'EDIT',
      reason: auditReason,
      user: user._id,
      timestamp: new Date()
    });
  } else {
    // For non-approved/verified states, check if it's a verification update
    if (entry.status !== 'DRAFT' && entry.status !== 'PENDING_RECEIPT' && entry.status !== 'SUBMITTED') {
      if (payload.status === 'VERIFIED' || payload.status === 'NEEDS_CORRECTION') {
        const updated = await StoreInwardEntry.findByIdAndUpdate(id, { status: payload.status }, { new: true });
        if (payload.status === 'VERIFIED' && updated && updated.purchaseInvoiceId) {
          await processInwardStockUpdate(updated._id.toString());
        }
        return res.status(200).json(new ApiResponse(200, updated, `Status updated to ${payload.status}`));
      }
    }
  }

  if (payload.status === 'SUBMITTED') {
    let totalPackQty = 0;
    if (payload.packingList) {
      payload.packingList.forEach((pack: any) => {
        totalPackQty += Number(pack.quantity) || 0;
      });
    }
    if (totalPackQty === 0) {
      throw new ApiError(400, 'Sum of packing list quantities must be > 0 to submit');
    }
    
    // Auto-approve upon submission
    payload.status = 'APPROVED';
  }

  // Remove fields that shouldn't be overwritten directly or handle them carefully
  delete payload.auditLogs;
  if (payload.status && !isAdmin && (entry.status === 'APPROVED' || entry.status === 'VERIFIED')) {
    delete payload.status;
  }

  payload.updatedBy = user._id;

  Object.assign(entry, payload);
  const updated = await entry.save();
  
  if (updated && (updated.status === 'SUBMITTED' || updated.status === 'APPROVED') && originalStatus !== 'SUBMITTED' && originalStatus !== 'APPROVED') {
    await processInwardStockUpdate(updated._id.toString());
  }
  
  res.status(200).json(new ApiResponse(200, updated, 'Inward Entry updated successfully'));
});

export const voidInwardEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role?.name === "Admin" || user?.role?.name === "Super Admin" || user?.role?.permissions?.includes("*");
  const { auditReason } = req.body;

  const entry = await StoreInwardEntry.findById(id);
  if (!entry) throw new ApiError(404, 'Store Inward Entry not found');
  if (entry.status === 'VOIDED') throw new ApiError(400, 'Entry is already voided');

  if (entry.status === 'APPROVED' || entry.status === 'VERIFIED') {
    if (!isAdmin) {
      throw new ApiError(403, 'Store Managers cannot void approved entries. Please request an Admin.');
    }
    if (!auditReason) {
      throw new ApiError(400, 'Audit reason is required when voiding an approved entry.');
    }
    
    // Check downstream consumption stock check
    const summary = await buildStockSummaryData();
    const itemStock = summary[entry.tempCode || ''];
    if (itemStock) {
      const oldPackingQty = entry.packingList?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0;
      if (itemStock.totalBalanceQty < oldPackingQty) {
         throw new ApiError(409, `Conflict: Cannot void GRN. Voiding removes ${oldPackingQty} from stock, but only ${itemStock.totalBalanceQty} available.`);
      }
    }
  }

  if (!entry.auditLogs) entry.auditLogs = [];
  if (auditReason || isAdmin) {
    entry.auditLogs.push({
      action: 'VOID',
      reason: auditReason || 'Voided unapproved entry',
      user: user._id,
      timestamp: new Date()
    });
  }

  entry.status = 'VOIDED';
  await entry.save();
  
  res.status(200).json(new ApiResponse(200, entry, 'Inward Entry voided successfully'));
});

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

        const circleKey = circle && circle !== 'Default' ? `${circle.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;

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
  if (entry.status !== 'SUBMITTED' && entry.status !== 'VERIFIED') return;
  
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

        const circleKey = circle && circle !== 'Default' ? `${circle.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;

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

            const circleKey = circle && circle !== 'Default' ? `${circle.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;

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


const parseCsvDate = (dateStr: string): Date | undefined => {
  if (!dateStr) return undefined;
  let d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    const parts = dateStr.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      else if (parts[2].length === 2) d = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export const importStoreTransfers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);

  const errors: string[] = [];
  let successCount = 0;
  
  // Group rows by ChallanNo or MinNo to bundle them into single StoreTransfer docs
  const transfersByDoc: Record<string, any> = {};
  const user = (req as any).user;
  const itemCache = new Map();

  for await (const row of parser) {
    try {
      const docKey = row['ChallanNo'] || row['Challan No'] || row['Challan No.'] || row['MinNo'] || row['MIN No'] || row['MIN No.'] || row['MINNo'] || '';
      if (!docKey) {
        const isEmpty = Object.values(row).every(v => !v || String(v).trim() === '');
        if (isEmpty) continue;
        errors.push(`Row missing ChallanNo or MinNo (needed to group rows)`);
        continue;
      }

      const itemName = row['ItemName'] || row['Description of Material'] || '';
      const tempCode = row['TempCode'] || row['Temp Code'] || '';
      
      if (!itemName && !tempCode) {
        errors.push(`Row missing ItemName/TempCode for Transfer ${docKey}`);
        continue;
      }

      // Find Item
      let item = null;
      const cacheKey = `${tempCode}_${itemName}`;
      if (itemCache.has(cacheKey)) {
        item = itemCache.get(cacheKey);
      } else {
        if (tempCode) {
          item = await Item.findOne({ 'dynamicData.tempCode': tempCode });
        }
        if (!item && itemName) {
          const escapedItemName = itemName.replace(new RegExp('[.*+?^${}()|\\\\[\\\\]\\\\\\\\]', 'g'), '\\$&');
          item = await Item.findOne({ 'dynamicData.description': { $regex: new RegExp(`^\\s*${escapedItemName}\\s*$`, 'i') } });
        }
        if (item) itemCache.set(cacheKey, item);
      }

      if (!item) {
         errors.push(`Item '${itemName || tempCode}' not found for Transfer ${docKey}`);
         continue;
      }

      const requestedQty = Number(row['RequestedQty'] || row['Transfer Qty'] || row['TransferQty'] || 0);
      const dispatchedQty = Number(row['DispatchedQty'] || row['Transfer Qty'] || row['TransferQty'] || requestedQty);
      const receivedQty = Number(row['ReceivedQty'] || dispatchedQty);

      if (dispatchedQty < 0) {
        errors.push(`Row has negative Transfer Qty for Transfer ${docKey}`);
        continue;
      }

      const unit = row['Unit'] || item?.unit || item?.dynamicData?.unit || 'Nos';
      
      const itemDynamic = item?.dynamicData || {};
      const csvLoaSrNo = row['LOA Serial No'] || row['LOASerialNo'] || row['Loa Serial No'] || row['LoaSrNo'];
      const itemLoaSrNo = itemDynamic.sku || itemDynamic.loaSerialNo || itemDynamic.loaSrNo || itemDynamic.srNo || itemDynamic['LOA Serial No'] || itemDynamic['LOA Sr. No.'] || '';
      const loaSerialNo = (csvLoaSrNo && String(csvLoaSrNo).trim() !== '') ? String(csvLoaSrNo).trim() : (itemLoaSrNo ? String(itemLoaSrNo).trim() : '');

      const csvLoaQty = row['LOA Qty'] || row['LOA Quantity'] || row['LoaQty'];
      let loaQty: number | undefined = undefined;
      if (csvLoaQty !== undefined && csvLoaQty !== '' && !isNaN(Number(csvLoaQty))) {
        loaQty = Number(csvLoaQty);
      } else {
        const fromStr = String(row['From'] || row['FromStore'] || '').toLowerCase().replace(/store|circle/gi, '').trim();
        const toStr = String(row['To'] || row['ToStore'] || '').toLowerCase().replace(/store|circle/gi, '').trim();
        if (fromStr && itemDynamic[`${fromStr}LoaQuantity`]) {
          loaQty = Number(itemDynamic[`${fromStr}LoaQuantity`]);
        } else if (toStr && itemDynamic[`${toStr}LoaQuantity`]) {
          loaQty = Number(itemDynamic[`${toStr}LoaQuantity`]);
        } else if (itemDynamic.loaQuantity !== undefined && itemDynamic.loaQuantity !== '') {
          loaQty = Number(itemDynamic.loaQuantity);
        } else if (itemDynamic.nahanLoaQuantity) {
          loaQty = Number(itemDynamic.nahanLoaQuantity);
        } else if (itemDynamic.solanLoaQuantity) {
          loaQty = Number(itemDynamic.solanLoaQuantity);
        } else if (itemDynamic.rampurLoaQuantity) {
          loaQty = Number(itemDynamic.rampurLoaQuantity);
        } else if (itemDynamic.rohruLoaQuantity) {
          loaQty = Number(itemDynamic.rohruLoaQuantity);
        } else if (itemDynamic.circleLoaQuantity) {
          loaQty = Number(itemDynamic.circleLoaQuantity);
        } else if (itemDynamic.totalPackageLoaQty) {
          loaQty = Number(itemDynamic.totalPackageLoaQty);
        }
      }

      const lineItem = {
        itemId: item._id,
        tempCode: item.itemCode || tempCode || '',
        description: item.description || itemName || '',
        unit,
        requestedQty,
        dispatchedQty,
        receivedQty,
        loaSerialNo,
        loaQty
      };

      if (!transfersByDoc[docKey]) {
        transfersByDoc[docKey] = {
          requestDate: parseCsvDate(row['Date']) || new Date(),
          registerType: 'OUTWARD',
          status: 'IN_TRANSIT',
          fromStore: row['From'] || row['FromStore'] || 'Unknown Store',
          toStore: row['To'] || row['ToStore'] || 'Unknown Store',
          requestedBy: user ? user._id : null,
          vendorName: row['Name of Vendor'] || row['VendorName'] || '',
          
          minBookNo: row['MIN BOOK No.'] || row['MIN BOOK No'] || row['MinBookNo'] || '',
          minNo: row['MIN No.'] || row['MIN No'] || row['MinNo'] || row['MINNo'] || '',
          minDate: parseCsvDate(row['MIN Date']),
          
          challanNo: row['Challan No.'] || row['Challan No'] || row['ChallanNo'] || '',
          challanDate: parseCsvDate(row['Challan Date']),
          
          transportName: row['Transport'] || row['TransportName'] || '',
          truckNumber: row['Truck No'] || row['TruckNumber'] || '',
          grNumber: row['GR No'] || row['GrNumber'] || '',
          grDate: parseCsvDate(row['GR Date']),
          driverName: row['Driver Name'] || row['DriverName'] || '',
          driverMobile: row['Mobile No'] || row['DriverMobile'] || '',
          remarks: row['Remark'] || row['Remarks'] || '',
          
          items: []
        };
      }

      transfersByDoc[docKey].items.push(lineItem);
    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  // Pass 1: Validate for existing records before saving
  for (const docKey of Object.keys(transfersByDoc)) {
    const payload = transfersByDoc[docKey];
    const existing = await StoreTransfer.findOne({ 
       $or: [
         { challanNo: { $eq: payload.challanNo, $ne: '' } },
         { minNo: { $eq: payload.minNo, $ne: '' } }
       ]
    });
    
    if (existing) {
      errors.push(`Transfer ${payload.challanNo || payload.minNo} already exists. Skipping.`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row validation errors. No data was imported.')
    );
  }

  // Pass 2: Save Data
  for (const docKey of Object.keys(transfersByDoc)) {
    try {
      const payload = transfersByDoc[docKey];
      await StoreTransfer.create([payload]);
      successCount++;
    } catch (err: any) {
      console.error(`Error saving Transfer ${docKey}:`, err);
    }
  }

  // Rebuild summary cache for imported items
  const affectedItemIds = new Set<string>();
  Object.values(transfersByDoc).forEach((t: any) => {
    (t.items || []).forEach((it: any) => {
      if (it.itemId) affectedItemIds.add(it.itemId.toString());
    });
  });
  affectedItemIds.forEach(id => {
    SummaryService.rebuildForItem(id).catch(console.error);
  });

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed successfully')
  );
});

export const importReceivedStoreTransfers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);
  
  const errors: string[] = [];
  let successCount = 0;
  
  const transfersByDoc: Record<string, any> = {};
  const user = (req as any).user;
  const itemCache = new Map();

  for await (const row of parser) {
    try {
      const docKey = row['Challan No'] || row['ChallanNo'] || row['Challan No.'] || row['MIN No.'] || row['MIN No'] || row['MINNo'] || row['MinNo'] || '';
      if (!docKey) {
        const isEmpty = Object.values(row).every(v => !v || String(v).trim() === '');
        if (isEmpty) continue;
        errors.push(`Row missing Challan No or MIN No. (needed to group rows)`);
        continue;
      }

      const itemName = row['Item Name'] || row['Description of Material'] || '';
      const tempCode = row['Final Temp Code'] || '';
      
      if (!itemName && !tempCode) {
        errors.push(`Row missing Item Name/Temp Code for Transfer ${docKey}`);
        continue;
      }

      let item = null;
      const cacheKey = `${tempCode}_${itemName}`;
      if (itemCache.has(cacheKey)) {
        item = itemCache.get(cacheKey);
      } else {
        if (tempCode) {
          item = await Item.findOne({ 'dynamicData.tempCode': tempCode });
        }
        if (!item && itemName) {
          const escapedItemName = itemName.replace(new RegExp('[.*+?^${}()|\\\\[\\\\]\\\\\\\\]', 'g'), '\\$&');
          item = await Item.findOne({ 'dynamicData.description': { $regex: new RegExp(`^\\s*${escapedItemName}\\s*$`, 'i') } });
        }
        if (item) itemCache.set(cacheKey, item);
      }

      if (!item) {
         errors.push(`Item '${itemName || tempCode}' not found for Transfer ${docKey}`);
         continue;
      }

      const receivedQty = Number(row['Transfer Qty'] || row['Received Qty'] || 0);

      if (receivedQty < 0) {
        errors.push(`Row has negative Received Qty for Transfer ${docKey}`);
        continue;
      }

      const unit = row['Unit'] || item?.unit || item?.dynamicData?.unit || 'Nos';
      
      const itemDynamic = item?.dynamicData || {};
      const csvLoaSrNo = row['LOA Serial No'] || row['LOASerialNo'] || row['Loa Serial No'] || row['LoaSrNo'];
      const itemLoaSrNo = itemDynamic.sku || itemDynamic.loaSerialNo || itemDynamic.loaSrNo || itemDynamic.srNo || itemDynamic['LOA Serial No'] || itemDynamic['LOA Sr. No.'] || '';
      const loaSerialNo = (csvLoaSrNo && String(csvLoaSrNo).trim() !== '') ? String(csvLoaSrNo).trim() : (itemLoaSrNo ? String(itemLoaSrNo).trim() : '');

      const csvLoaQty = row['LOA Qty'] || row['LOA Quantity'] || row['LoaQty'];
      let loaQty: number | undefined = undefined;
      if (csvLoaQty !== undefined && csvLoaQty !== '' && !isNaN(Number(csvLoaQty))) {
        loaQty = Number(csvLoaQty);
      } else {
        const fromStr = String(row['From'] || '').toLowerCase().replace(/store|circle/gi, '').trim();
        const toStr = String(row['To'] || '').toLowerCase().replace(/store|circle/gi, '').trim();
        if (fromStr && itemDynamic[`${fromStr}LoaQuantity`]) {
          loaQty = Number(itemDynamic[`${fromStr}LoaQuantity`]);
        } else if (toStr && itemDynamic[`${toStr}LoaQuantity`]) {
          loaQty = Number(itemDynamic[`${toStr}LoaQuantity`]);
        } else if (itemDynamic.loaQuantity !== undefined && itemDynamic.loaQuantity !== '') {
          loaQty = Number(itemDynamic.loaQuantity);
        } else if (itemDynamic.nahanLoaQuantity) {
          loaQty = Number(itemDynamic.nahanLoaQuantity);
        } else if (itemDynamic.solanLoaQuantity) {
          loaQty = Number(itemDynamic.solanLoaQuantity);
        } else if (itemDynamic.rampurLoaQuantity) {
          loaQty = Number(itemDynamic.rampurLoaQuantity);
        } else if (itemDynamic.rohruLoaQuantity) {
          loaQty = Number(itemDynamic.rohruLoaQuantity);
        } else if (itemDynamic.circleLoaQuantity) {
          loaQty = Number(itemDynamic.circleLoaQuantity);
        } else if (itemDynamic.totalPackageLoaQty) {
          loaQty = Number(itemDynamic.totalPackageLoaQty);
        }
      }

      const lineItem = {
        itemId: item._id,
        tempCode: item.itemCode || tempCode || '',
        description: item.description || itemName || '',
        unit,
        requestedQty: receivedQty,
        dispatchedQty: receivedQty,
        receivedQty,
        loaSerialNo,
        loaQty
      };

      if (!transfersByDoc[docKey]) {
        transfersByDoc[docKey] = {
          requestDate: parseCsvDate(row['Date of Received']) || new Date(),
          registerType: 'INWARD',
          status: 'RECEIVED',
          fromStore: row['From'] || 'Unknown Store',
          toStore: row['To'] || 'Unknown Store',
          requestedBy: user ? user._id : null,
          vendorName: row['Name of Vendor'] || '',
          
          minBookNo: row['MIN BOOK No.'] || row['MIN BOOK No'] || row['MinBookNo'] || '',
          minNo: row['MIN No.'] || row['MIN No'] || row['MinNo'] || row['MINNo'] || '',
          minDate: parseCsvDate(row['MIN Date']),
          
          challanNo: row['Challan No.'] || row['Challan No'] || row['ChallanNo'] || '',
          challanDate: parseCsvDate(row['Challan Date']),
          
          transportName: row['Transport'] || '',
          truckNumber: row['Truck No'] || '',
          grNumber: row['GR No'] || '',
          grDate: row['Date'] ? parseCsvDate(row['Date']) : undefined,
          driverName: row['Driver Name'] || '',
          driverMobile: row['Mobile No.'] || '',
          remarks: row['Remark'] || '',
          
          items: []
        };
      }

      transfersByDoc[docKey].items.push(lineItem);
    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  // Pass 1: Validate for existing records before saving
  for (const docKey of Object.keys(transfersByDoc)) {
    const payload = transfersByDoc[docKey];
    const existing = await StoreTransfer.findOne({ 
       $or: [
         { challanNo: { $eq: payload.challanNo, $ne: '' } },
         { minNo: { $eq: payload.minNo, $ne: '' } }
       ]
    });
    
    if (existing) {
      errors.push(`Transfer ${payload.challanNo || payload.minNo} already exists. Skipping.`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row validation errors. No data was imported.')
    );
  }

  // Pass 2: Save Data
  for (const docKey of Object.keys(transfersByDoc)) {
    try {
      const payload = transfersByDoc[docKey];
      await StoreTransfer.create([payload]);
      
      const fromStoreStr = payload.fromStore && payload.fromStore !== '-' ? payload.fromStore : '';
      const toStoreStr = payload.toStore && payload.toStore !== '-' ? payload.toStore : '';
      
      const fromCircleKey = fromStoreStr ? `${fromStoreStr.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;
      const toCircleKey = toStoreStr ? `${toStoreStr.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;

      for (const lineItem of payload.items) {
        if (lineItem.receivedQty > 0) {
          const item = await Item.findById(lineItem.itemId);
          if (item) {
            const currentFromQty = fromCircleKey ? Number(item.dynamicData?.[fromCircleKey] || 0) : 0;
            const currentToQty = toCircleKey ? Number(item.dynamicData?.[toCircleKey] || 0) : 0;
            
            const updateData: any = {};
            if (fromCircleKey) updateData[fromCircleKey] = Math.max(0, currentFromQty - lineItem.receivedQty);
            if (toCircleKey) updateData[toCircleKey] = currentToQty + lineItem.receivedQty;

            if (Object.keys(updateData).length > 0) {
              item.dynamicData = {
                ...item.dynamicData,
                ...updateData
              };
              item.markModified('dynamicData');
              await item.save();
              
              SummaryService.rebuildForItem(item._id.toString()).catch(console.error);
            }
          }
        }
      }
      
      successCount++;
    } catch (err: any) {
      console.error(`Error saving Transfer ${docKey}:`, err);
    }
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed successfully')
  );
});

// ==================== MHROV CONTROLLERS ====================

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
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };
  }

  const mhrovs = await Mhrov.find(filter)
    .populate("inwardEntries", "invoiceNumber itemName totalQty")
    .populate("items.diId", "diNumber")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, mhrovs, 'MHROVs fetched successfully'));
});

export const exportMhrovs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };
  }

  const mhrovs = await Mhrov.find(filter).populate("inwardEntries").sort({ createdAt: 1 }).lean();

  const csvData = mhrovs.flatMap(m => {
    if (!m.items || m.items.length === 0) return [];
    return m.items.map(item => {
      let inwardEntry = {} as any;
      if (item.inwardEntryId) {
        inwardEntry = (m.inwardEntries as any[]).find(entry => entry._id.toString() === item.inwardEntryId!.toString()) || {} as any;
      } else if (item.diId) {
        inwardEntry = { diRefNo: "N/A" }; // Placeholder, full DI population can be added later if needed
      }
      
      return {
        "MHROV No": m.mhrovNumber || '',
        "MHROV Date": m.mhrovDate ? new Date(m.mhrovDate).toISOString().split('T')[0] : '',
        "Status": m.status || '',
        "Package": m.package || '',
        "Circle": m.circle || '',
        "DI No": inwardEntry.diRefNo || '',
        "Vendor Name": inwardEntry.vendorName || '',
        "Invoice No": inwardEntry.invoiceNumber || inwardEntry.inwardId || '',
        "PO No": inwardEntry.poNumber || '',
        "Item Name": inwardEntry.itemName || '',
        "LOA Serial No": inwardEntry.serialNumber || '',
        "Temp Code": inwardEntry.tempCode || '',
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
        status: row['status'] || 'pending',
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
    
    const inwardEntriesArray = [];
    const finalItems = [];

    // Bulk fetch to prevent N+1 query problem and DB timeouts
    const cleanStr = (s: any) => String(s || '').replace(/\*+$/, '').trim();
    const cleanStrLower = (s: any) => cleanStr(s).toLowerCase();
    const normalizeForMatch = (s: any) => cleanStrLower(s).replace(/\s+/g, '');

    // Collect all possible keys, cleaned of asterisks and whitespace
    const uniqueDiNos = [...new Set(mhrovData.items.map((i: any) => cleanStr(i.diNo)).filter(Boolean))];
    const uniqueTempCodes = [...new Set(mhrovData.items.map((i: any) => cleanStr(i.tempCode)).filter(Boolean))];
    const uniqueItemNamesLower = [...new Set(mhrovData.items.map((i: any) => cleanStrLower(i.itemName)).filter(Boolean))];
    
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
  
  if (mhrov.status === 'done') {
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
  const filter: any = { status: { $in: ['VERIFIED', 'APPROVED'] } };
  const mhrovFilter: any = {};
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) {
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
      if (mhrovData.status?.toUpperCase() === 'DONE' || mhrovData.status?.toUpperCase() === 'VERIFIED') doneCount++;
      else if (mhrovData.status?.toUpperCase() === 'PENDING') pendingCount++;
      else if (mhrovData.status === 'MHROV done but not signed') doneNotSignedCount++;
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

export const bulkImportInwardEntries = asyncHandler(async (req: Request, res: Response) => {
  const { entries } = req.body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    throw new ApiError(400, 'Invalid or empty entries array provided');
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  const updatesToApply: any[] = [];

  // Pass 1: Validation
  for (const row of entries) {
    try {
      const entryId = row['Entry ID'];
      if (!entryId) {
        results.failed++;
        results.errors.push('Missing Entry ID in row');
        continue;
      }

      const existingEntry = await StoreInwardEntry.findById(entryId);
      if (!existingEntry) {
        results.failed++;
        results.errors.push(`Entry ID ${entryId} not found`);
        continue;
      }

      // Extract optional values with defaults
      const receivedQty = Number(row['Received Qty']) || 0;
      const rejectedQty = Number(row['Rejected Qty']) || 0;
      // If Accepted Qty is provided, use it, otherwise use Received - Rejected, or default to invoiceQty
      const invoiceQty = Number(row['Invoice Qty (Accepted)']) || (receivedQty > 0 ? (receivedQty - rejectedQty) : Number(existingEntry.invoiceQty)) || 0;
      
      const rate = Number(row['Rate']) || Number(existingEntry.rate) || 0;
      const packType = row['Pack Type'] || existingEntry.packingList?.[0]?.packType || 'BOX';
      const packQty = Number(row['Pack Qty']) || invoiceQty;
      
      const transportName = row['Transport Name'] || existingEntry.transportName || '';
      const truckNumber = row['Truck Number'] || existingEntry.truckNumber || '';
      const grNumber = row['GR Number'] || existingEntry.grNumber || '';
      
      let grDate = existingEntry.grDate;
      if (row['GR Date']) {
        const parsed = new Date(row['GR Date']);
        if (!isNaN(parsed.getTime())) grDate = parsed;
      }

      let receivedDate = existingEntry.receivedDate || new Date();
      if (row['Received Date']) {
        const parsed = new Date(row['Received Date']);
        if (!isNaN(parsed.getTime())) receivedDate = parsed;
      }

      const biltyNumber = row['Bilty Number'] || existingEntry.biltyNumber || '';
      const remarks = row['Remarks'] || existingEntry.remarks || '';

      // Perform calculations
      const cgstRate = Number(existingEntry.cgst) > 0 ? (Number(existingEntry.cgst) / (Number(existingEntry.taxableAmount) || 1) * 100) : 0;
      const sgstRate = Number(existingEntry.sgst) > 0 ? (Number(existingEntry.sgst) / (Number(existingEntry.taxableAmount) || 1) * 100) : 0;
      const igstRate = Number(existingEntry.igst) > 0 ? (Number(existingEntry.igst) / (Number(existingEntry.taxableAmount) || 1) * 100) : 0;

      const taxableAmount = invoiceQty * rate;
      const cgst = (taxableAmount * cgstRate) / 100;
      const sgst = (taxableAmount * sgstRate) / 100;
      const igst = (taxableAmount * igstRate) / 100;
      const amount = taxableAmount + cgst + sgst + igst;

      const updateData = {
        inwardId: row['Inward ID'] || existingEntry.inwardId || `INW-${existingEntry._id.toString().slice(-6).toUpperCase()}`,
        challanQty: Number(row['Challan Qty']) || existingEntry.challanQty || invoiceQty,
        rejectedQty,
        invoiceQty,
        totalQty: invoiceQty,
        rate,
        taxableAmount,
        cgst,
        sgst,
        igst,
        amount,
        transportName,
        truckNumber,
        grNumber,
        grDate,
        biltyNumber,
        receivedDate,
        remarks,
        status: 'SUBMITTED', // Move directly to SUBMITTED
        packingList: [{
          packType,
          quantity: packQty,
          packUnit: existingEntry.packingList?.[0]?.packUnit || 'Nos'
        }]
      };

      updatesToApply.push({
        entryId,
        updateData,
        itemId: existingEntry.itemId
      });

    } catch (err: any) {
      results.failed++;
      results.errors.push(`Row processing failed: ${err.message}`);
    }
  }

  if (results.errors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { results }, 'Bulk import failed due to row errors. No entries were updated.')
    );
  }

  // Pass 2: Apply Updates
  for (const update of updatesToApply) {
    try {
      await StoreInwardEntry.findByIdAndUpdate(update.entryId, update.updateData);
      
      if (update.itemId) {
        SummaryService.rebuildForItem(update.itemId.toString()).catch(console.error);
      }
      
      results.success++;
    } catch (err: any) {
      console.error(`Failed to update inward entry ${update.entryId}:`, err);
    }
  }

  res.status(200).json(
    new ApiResponse(200, results, 'Bulk import completed')
  );
});


// ==========================================
// NEW API: Query DI Line Items for MHROV
// ==========================================
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
