import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
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
import { SummaryService } from '../reports/summary/summary.service';
import { expandCircle } from '../../utils/hierarchy';

export const getPendingDIs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = { status: { $in: ['Active', 'Pending Receipt', 'Received'] } }; // Keeping old statuses temporarily for backward compatibility with existing DB entries
  
  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
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
      status: { $in: ['Submitted', 'Verified'] }
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
    po = await PurchaseOrder.findOne({ _id: invoice.purchaseOrderId, isDeleted: { $ne: true } });
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

  const po = di.purchaseOrderId ? await PurchaseOrder.findOne({ _id: di.purchaseOrderId, isDeleted: { $ne: true } }) : null;
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
  const existingFilter: any = { status: { $ne: 'Draft' } };
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
  if (data.status === 'Submitted') {
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
    data.status = 'Approved';
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
  const draftFilter: any = { status: 'Draft' };
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
    if (entry.status === 'Draft') {
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
  if (data.status === 'Approved') {
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

// 
// NEW API: Filter Options for MHROV DI Search
// 
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
    filter.status = { $ne: 'Draft' };
  }

  const entries = await StoreInwardEntry.find(filter)
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: 1 });

  res.status(200).json(
    new ApiResponse(200, entries, 'Admin entries fetched successfully')
  );
});

export async function buildStockSummaryData(circleFilter?: string, packageFilter?: string, contractorId?: string) {
  let contractorFilter: any = null;
  if (contractorId) {
    const cIdStr = String(contractorId).trim();
    const cIdObj = mongoose.Types.ObjectId.isValid(cIdStr) ? new mongoose.Types.ObjectId(cIdStr) : cIdStr;
    contractorFilter = { $in: [cIdStr, cIdObj] };
  }

  // Build filters for Inward, Assignments, Returns
  const inwardFilter: any = { status: { $in: ['Verified', 'Approved'] } };
  if (circleFilter) inwardFilter.circle = { $regex: new RegExp(`^${circleFilter}$`, 'i') };
  if (packageFilter) inwardFilter.package = packageFilter;

  const assignmentFilter: any = { status: 'Sent' };
  // if (contractorFilter) assignmentFilter.contractorId = contractorFilter; // Removed so we fetch ALL assignments to get true store balance
  if (circleFilter) {
    assignmentFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { circle: { $exists: false } },
      { circle: null },
      { circle: '' }
    ];
  }

  const returnsFilter: any = { status: { $in: ['Submitted', 'Approved'] } };
  // if (contractorFilter) returnsFilter.contractorId = contractorFilter; // Removed so we fetch ALL returns to get true store balance
  if (circleFilter) {
    returnsFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { circle: { $exists: false } },
      { circle: null },
      { circle: '' }
    ];
  }

  const wipJmcFilter: any = { status: { $ne: 'Rejected' } };
  if (contractorFilter) wipJmcFilter.contractorId = contractorFilter;
  if (circleFilter) {
    wipJmcFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { circle: { $exists: false } },
      { circle: null },
      { circle: '' }
    ];
  }


  const mhrovFilter: any = {};
  if (circleFilter) {
    mhrovFilter.$or = [
      { circle: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { division: { $regex: new RegExp(`^${circleFilter}$`, 'i') } },
      { circle: { $exists: false } },
      { circle: null },
      { circle: '' }
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
    jmcRecords,
    mhrovs
  ] = await Promise.all([
    Item.find({ isDeleted: false }).lean(),
    StoreInwardEntry.find(inwardFilter).lean(),
    ContractorAssignment.find(assignmentFilter).lean(),
    ContractorReturn.find(returnsFilter).lean(),
    StoreTransfer.find({ status: 'RECEIVED' }).lean(),
    WipRegister.find(wipJmcFilter).lean(),
    JmcRegister.find(wipJmcFilter).lean(),
    Mhrov.find(mhrovFilter).lean()
  ]);
  console.log("Fetched all DB collections successfully!");

  // 5. Aggregate data per item
  const summaryMap: Record<string, any> = {};

  items.forEach(item => {
    const data = item.dynamicData || {};
    const tempCode = data.tempCode || data.temp_code || '';
    const activity = data.activity || data.itemActivity || 'Uncategorized Activity';
    const loaSrNo = data.loaSrNo || data.loaSerialNo || data.loaSerialNumber || data.sku || '';
    
    const cLower = circleFilter ? circleFilter.toLowerCase() : '';
    const circleLoaQty = Number(cLower ? (data[`${cLower}LoaQuantity`] || 0) : (data.loaQuantity || 0));

    if (!summaryMap[tempCode]) {
      summaryMap[tempCode] = {
        itemId: item._id,
        sr: 0,
        tempCode: tempCode,
        activity: activity,
        hsnCode: data.hsnCode || data.hsn_code || '-',
        description: data.name || data.description || '-',
        unit: data.unit || 'Nos',
        loaSrNo: loaSrNo,
        circleLoaQty: circleLoaQty,
        allActivities: new Set<string>(),
        allLoaSrs: new Set<string>(),
        activityDetailsMap: {} as Record<string, { loaSrNo: string, description: string }>,
        challanQty: 0,
        receivedQty: 0,
      rejectedQty: 0,
      acceptedQty: 0,
      mhrovQty: 0,
      receivedFromOtherStore: 0,
      totalInStockAfterReceive: 0,
      transferToOtherStore: 0,
      contractorsIssuedQty: 0,
      contractorsReturnQty: 0,
      contractorsActualIssued: 0,
      allContractorsIssuedQty: 0,
      allContractorsReturnQty: 0,
      allContractorsActualIssued: 0,
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
    } else {
      summaryMap[tempCode].circleLoaQty += circleLoaQty;
    }
    
    if (activity) {
      summaryMap[tempCode].allActivities.add(activity);
      if (!summaryMap[tempCode].activityDetailsMap[activity]) {
        summaryMap[tempCode].activityDetailsMap[activity] = [];
      }
      summaryMap[tempCode].activityDetailsMap[activity].push({
        itemId: item._id,
        loaSrNo: loaSrNo,
        description: data.name || data.description || '-'
      });
    }
    if (loaSrNo) summaryMap[tempCode].allLoaSrs.add(loaSrNo);
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

  // Calculate MRHOV Qty
  mhrovs.forEach((mhrov: any) => {
    (mhrov.items || []).forEach((it: any) => {
      const tc = it.tempCode || '';
      if (summaryMap[tc]) {
        summaryMap[tc].mhrovQty += Number(it.mhrovDoneQty || 0);
      }
    });
  });

  // Calculate Contractor Assignments
  assignments.forEach(assignment => {
    const isThisContractor = contractorFilter ? (
      assignment.contractorId?.toString() === String(contractorId).trim() || 
      String(assignment.contractorId) === String(contractorId).trim()
    ) : true;
    
    assignment.lineItems?.forEach((line: any) => {
      const tc = line.tempCode || '';
      if (summaryMap[tc]) {
        const qty = line.quantity || 0;
        summaryMap[tc].allContractorsIssuedQty += qty;
        if (isThisContractor) {
          summaryMap[tc].contractorsIssuedQty += qty;
        }
      }
    });
  });

  // Calculate Contractor Returns
  contractorReturns.forEach(ret => {
    const isThisContractor = contractorFilter ? (
      ret.contractorId?.toString() === String(contractorId).trim() || 
      String(ret.contractorId) === String(contractorId).trim()
    ) : true;

    ret.lineItems?.forEach((line: any) => {
      const tc = line.tempCode || '';
      if (summaryMap[tc]) {
        const qty = line.quantity || 0;
        summaryMap[tc].allContractorsReturnQty += qty;
        if (isThisContractor) {
          summaryMap[tc].contractorsReturnQty += qty;
        }
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
    sm.allContractorsActualIssued = sm.allContractorsIssuedQty - sm.allContractorsReturnQty;
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
    row.totalBalanceQty = row.totalInStockAfterReceive - row.transferToOtherStore - row.allContractorsActualIssued;
    row.allActivities = Array.from(row.allActivities || []);
    row.allLoaSrs = Array.from(row.allLoaSrs || []);
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
  const { circle, package: pkg, contractorId, contractorName } = req.query;
  
  let resolvedContractorId = contractorId as string;
  if (!resolvedContractorId && contractorName) {
    const mongoose = require('mongoose');
    const Contractor = mongoose.models.Contractor || mongoose.model('Contractor');
    const escaped = String(contractorName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(`^${escaped}$`, 'i');
    const c = await Contractor.findOne({
      $or: [
        { 'dynamicData.companyName': { $regex: searchRegex } },
        { 'dynamicData.displayName': { $regex: searchRegex } },
        { 'dynamicData.name': { $regex: searchRegex } },
        { 'dynamicData.contractorName': { $regex: searchRegex } },
        { 'dynamicData.firmName': { $regex: searchRegex } },
        { 'dynamicData.primaryContact.firstName': { $regex: searchRegex } },
        { name: { $regex: searchRegex } },
        { displayName: { $regex: searchRegex } }
      ]
    }).lean();
    if (c) {
      resolvedContractorId = c._id.toString();
    } else {
      // Specified contractor name was not found in DB -> return 0 for contractor metrics
      resolvedContractorId = new mongoose.Types.ObjectId().toString();
    }
  }

  const summary = await buildStockSummaryData(circle as string, pkg as string, resolvedContractorId);
  res.status(200).json(new ApiResponse(200, summary, 'Stock summary fetched successfully'));
});

export const getAdminStockSummary = asyncHandler(async (req: Request, res: Response) => {
  const { circle, package: pkg, contractorId, contractorName } = req.query;

  let resolvedContractorId = contractorId as string;
  if (!resolvedContractorId && contractorName) {
    const mongoose = require('mongoose');
    const Contractor = mongoose.models.Contractor || mongoose.model('Contractor');
    const escaped = String(contractorName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(`^${escaped}$`, 'i');
    const c = await Contractor.findOne({
      $or: [
        { 'dynamicData.companyName': { $regex: searchRegex } },
        { 'dynamicData.displayName': { $regex: searchRegex } },
        { 'dynamicData.name': { $regex: searchRegex } },
        { 'dynamicData.contractorName': { $regex: searchRegex } },
        { 'dynamicData.firmName': { $regex: searchRegex } },
        { 'dynamicData.primaryContact.firstName': { $regex: searchRegex } },
        { name: { $regex: searchRegex } },
        { displayName: { $regex: searchRegex } }
      ]
    }).lean();
    if (c) {
      resolvedContractorId = c._id.toString();
    } else {
      // Specified contractor name was not found in DB -> return 0 for contractor metrics
      resolvedContractorId = new mongoose.Types.ObjectId().toString();
    }
  }

  const summary = await buildStockSummaryData(circle as string, pkg as string, resolvedContractorId);
  res.status(200).json(new ApiResponse(200, summary, 'Admin stock summary fetched successfully'));
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
      
      const userObj = (req as any).user;
      const isStoreManager = userObj?.role?.name === 'Store Manager';
      const isTargetSubcircle = ['Nalagarh', 'Kumarhatti'].includes(userObj?.assignedSubcircle);

      let invoice = null;
      let isInvoiceValid = false;

      if (invoiceNumber && invoiceNumber !== 'HISTORICAL') {
         invoice = await PurchaseInvoice.findOne({ invoiceNumber });
         if (invoice && (invoice.status === 'Pending Receipt' || invoice.status === 'Partially Received')) {
            isInvoiceValid = true;
         }
      }

      const shouldBypassAsHistorical = isStoreManager && isTargetSubcircle && (!invoiceNumber || invoiceNumber === 'HISTORICAL' || !isInvoiceValid);

      if (shouldBypassAsHistorical) {
         const tempCode = row['TempCode'] || row['tempCode'];
         const itemName = row['ItemName'] || row['itemName'] || row['Item Name'] || row['ItemDescription'] || row['itemDescription'];
         
         if (!tempCode && !itemName && !row['InvoiceNumber'] && !row['AcceptedQty']) {
           continue;
         }

         let itemData = null;
         if (tempCode) {
           itemData = await Item.findOne({ 'dynamicData.tempCode': String(tempCode).trim() });
         } else if (itemName) {
           itemData = await Item.findOne({ 'dynamicData.name': { $regex: new RegExp(`^${String(itemName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
         }

         if (!itemData) {
            errors.push(`Historical Item not found: ${tempCode || itemName}`);
            continue;
         }

         const acceptedQty = Number(row['AcceptedQty'] || row['acceptedQty'] || row['ReceivedQty'] || 0);
         if (acceptedQty < 0) {
           errors.push(`Accepted Qty cannot be negative for Historical Entry`);
           continue;
         }

         const rate = row['Rate'] !== undefined && row['Rate'] !== '' ? Number(row['Rate']) : 0;
         const taxableAmount = row['TaxableAmount'] !== undefined && row['TaxableAmount'] !== '' ? Number(row['TaxableAmount']) : acceptedQty * rate;
         const cgst = row['Cgst'] !== undefined && row['Cgst'] !== '' ? Number(row['Cgst']) : 0;
         const sgst = row['Sgst'] !== undefined && row['Sgst'] !== '' ? Number(row['Sgst']) : 0;
         const igst = row['Igst'] !== undefined && row['Igst'] !== '' ? Number(row['Igst']) : 0;
         const amount = row['Amount'] !== undefined && row['Amount'] !== '' ? Number(row['Amount']) : (taxableAmount + cgst + sgst + igst);

         validPayloads.push({
           inwardId: row['InwardId'] || row['Inward ID'] || row['inwardId'] || `INW-HIST-${Math.floor(1000 + Math.random() * 9000)}`,
           entryType: 'HISTORICAL',
           vendorName: 'Historical Opening Balance',
           invoiceNumber: invoiceNumber || 'HISTORICAL',
           receivedDate: row['ReceivedDate'] ? new Date(row['ReceivedDate']) : new Date(),
           unit: row['Unit'] || itemData.dynamicData?.unit || 'Nos',
           invoiceQty: acceptedQty,
           totalQty: acceptedQty,
           challanQty: Number(row['ChallanQty'] || row['challanQty'] || 0),
           rejectedQty: Number(row['RejectedQty'] || row['rejectedQty'] || 0),
           rate, amount, taxableAmount, cgst, sgst, igst,
           tempCode: itemData.dynamicData?.tempCode,
           itemId: itemData._id,
           itemName: itemData.dynamicData?.name,
           itemDescription: itemData.dynamicData?.description,
           circle: row['Circle'] || userObj?.assignedCircle || '',
           subcircle: row['Subcircle'] || userObj?.assignedSubcircle || '',
           package: row['Package'] || userObj?.assignedPackage || '',
           status: 'Approved',
           packingList: [{ packType: 'BOX', quantity: acceptedQty }],
           createdBy: userObj?._id,
           remarks: row['Remarks'] || 'Historical Opening Balance'
         });
         continue; 
      }

      if (!invoiceNumber) {
        errors.push(`Row missing Invoice Number`);
        continue;
      }

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
        po = await PurchaseOrder.findOne({ _id: invoice.purchaseOrderId, isDeleted: { $ne: true } });
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
        status: 'Draft',
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
      let entry = null;
      if (payload.entryType !== 'HISTORICAL') {
         const draftFilter: any = { 
           status: 'Draft',
           purchaseInvoiceId: payload.purchaseInvoiceId,
           serialNumber: payload.serialNumber
         };
         entry = await StoreInwardEntry.findOne(draftFilter);
      }
      
      if (entry) {
        await StoreInwardEntry.findByIdAndUpdate(entry._id, payload);
      } else {
        await StoreInwardEntry.create([payload]);
      }
      
      // If it's an instantly-approved historical bypass, rebuild stock so it reflects immediately
      if (payload.entryType === 'HISTORICAL' && payload.status === 'Approved' && payload.itemId) {
         const { SummaryService } = await import('../reports/summary/summary.service');
         await SummaryService.rebuildForItem(payload.itemId.toString());
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
  const baseFilter: any = { $or: [{ purchaseInvoiceId: { $exists: true } }, { entryType: 'HISTORICAL' }] };

  // Scope filter to assigned package/circle/subcircle for Store Managers
  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
    if (user.assignedPackage && user.assignedPackage.trim()) {
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
  
  const filter: any = { 
    status: { $in: ['Pending Receipt', 'Approved'] }
  };
  
  
  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
    if (user.assignedPackage && user.assignedPackage.trim()) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    if (user.assignedSubcircle) {
      filter.subcircle = { $regex: new RegExp(`^\\s*${user.assignedSubcircle.trim()}\\s*$`, 'i') };
    } else if (user.assignedCircle) {
      filter.circle = { $in: expandCircle(user.assignedCircle) || [user.assignedCircle] };
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
    $or: [{ purchaseInvoiceId: { $exists: true } }, { entryType: 'HISTORICAL' }]
  };

  if (status === 'Pending Receipt') {
    filter.status = 'Pending Receipt';
  } else if (status === 'Approved') {
    filter.status = { $in: ['Approved', 'Verified', 'INWARDED', 'Submitted'] };
  } else {
    filter.status = { $in: ['Pending Receipt', 'Approved', 'Verified', 'INWARDED', 'Submitted'] };
  }
  
  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
    if (user.assignedPackage && user.assignedPackage.trim()) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    if (user.assignedSubcircle) {
      filter.subcircle = { $regex: new RegExp(`^\\s*${user.assignedSubcircle.trim()}\\s*$`, 'i') };
    } else if (user.assignedCircle) {
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
  
  if (entry.status !== 'Pending Receipt') {
    return res.status(400).json(new ApiResponse(400, null, 'Entry is not pending receipt'));
  }

  entry.status = 'Approved';
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
  if (entry.status === 'Voided') throw new ApiError(400, 'Cannot edit a voided entry.');

  const originalStatus = entry.status;

  if (entry.status === 'Approved' || entry.status === 'Verified') {
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
    if (entry.status !== 'Draft' && entry.status !== 'Pending Receipt' && entry.status !== 'Submitted') {
      if (payload.status === 'Verified' || payload.status === 'Needs Correction') {
        const updated = await StoreInwardEntry.findByIdAndUpdate(id, { status: payload.status }, { new: true });
        if (payload.status === 'Verified' && updated && updated.purchaseInvoiceId) {
          await processInwardStockUpdate(updated._id.toString());
        }
        return res.status(200).json(new ApiResponse(200, updated, `Status updated to ${payload.status}`));
      }
    }
  }

  if (payload.status === 'Submitted') {
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
    payload.status = 'Approved';
  }

  // Remove fields that shouldn't be overwritten directly or handle them carefully
  delete payload.auditLogs;
  if (payload.status && !isAdmin && (entry.status === 'Approved' || entry.status === 'Verified')) {
    delete payload.status;
  }

  payload.updatedBy = user._id;

  Object.assign(entry, payload);
  const updated = await entry.save();
  
  if (updated && (updated.status === 'Submitted' || updated.status === 'Approved') && originalStatus !== 'Submitted' && originalStatus !== 'Approved') {
    await processInwardStockUpdate(updated._id.toString());
  }
  
  res.status(200).json(new ApiResponse(200, updated, 'Inward Entry updated successfully'));
});

// Get all inward entries for a given purchaseInvoiceId — scoped by circle + package for Store Managers
export const getInwardEntriesByInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  const user = (req as any).user;
  const { circle: circleParam, package: pkgParam, subcircle: subcircleParam } = req.query;

  const isHistorical = invoiceId === 'HISTORICAL';

  if (!isHistorical && !mongoose.Types.ObjectId.isValid(invoiceId as string)) {
    throw new ApiError(400, 'Invalid invoice ID');
  }

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin' || user?.role?.permissions?.includes('*');

  const filter: any = {};
  if (isHistorical) {
    filter.entryType = 'HISTORICAL';
  } else {
    filter.purchaseInvoiceId = new mongoose.Types.ObjectId(invoiceId as string);
  }

  if (!isAdmin) {
    // Store Manager: scope to their assigned circle + subcircle + package (same as getPendingStoreReceipts)
    if (user.assignedPackage && user.assignedPackage.trim()) {
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
  } else {
    // Admin: allow optional query param filters for scoping to a specific circle+subcircle+package group
    if (circleParam && circleParam !== 'All') {
      filter.circle = { $in: expandCircle(circleParam as string) || [circleParam as string] };
    }
    if (subcircleParam && subcircleParam !== 'All') {
      filter.subcircle = { $regex: new RegExp(`^\\s*${(subcircleParam as string).trim()}\\s*$`, 'i') };
    }
    if (pkgParam && pkgParam !== 'All') {
      const normalizedPkg = (pkgParam as string).replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
  }

  const entries = await StoreInwardEntry.find(filter).lean();
  res.status(200).json(new ApiResponse(200, entries, 'Entries fetched successfully'));
});


// Bulk update all inward entries (Bulk GRN submission) — with circle + package ownership validation
export const bulkUpdateInwardEntries = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  const { commonFields, items, status } = req.body;
  const user = (req as any).user;

  if (!mongoose.Types.ObjectId.isValid(invoiceId as string)) {
    throw new ApiError(400, 'Invalid invoice ID');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'No items provided for bulk update');
  }

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin' || user?.role?.permissions?.includes('*');

  // Build allowed circles/subcircle/package for the requesting user (for validation)
  const allowedCircles = isAdmin ? null : (expandCircle(user.assignedCircle) || (user.assignedCircle ? [user.assignedCircle] : null));
  const allowedSubcircleRegex = (!isAdmin && user.assignedSubcircle)
    ? new RegExp(`^\\s*${user.assignedSubcircle.trim()}\\s*$`, 'i')
    : null;
  const allowedPackageRegex = (!isAdmin && user.assignedPackage && user.assignedPackage.trim())
    ? (() => {
        const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
        const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
        return new RegExp(`^\\s*${regexStr}\\s*$`, 'i');
      })()
    : null;

  const submissionStatus: string = status || 'Submitted';
  const results: any[] = [];

  for (const item of items) {
    const entry = await StoreInwardEntry.findById(item._id);
    if (!entry) continue;
    if (entry.status === 'Voided') continue;

    // ── Ownership validation for non-admins (circle + subcircle + package) ──
    if (!isAdmin) {
      if (allowedCircles && entry.circle && !allowedCircles.some(c => c.toLowerCase() === entry.circle!.toLowerCase())) {
        throw new ApiError(403, `Forbidden: Item "${entry.itemName || item._id}" belongs to circle "${entry.circle}" which is outside your assigned circle.`);
      }
      if (allowedSubcircleRegex && entry.subcircle && !allowedSubcircleRegex.test(entry.subcircle)) {
        throw new ApiError(403, `Forbidden: Item "${entry.itemName || item._id}" belongs to sub-circle "${entry.subcircle}" which is outside your assigned sub-circle.`);
      }
      if (allowedPackageRegex && entry.package && !allowedPackageRegex.test(entry.package)) {
        throw new ApiError(403, `Forbidden: Item "${entry.itemName || item._id}" belongs to package "${entry.package}" which is outside your assigned package.`);
      }
    }

    const originalStatus = entry.status;

    // Apply common header fields to every entry
    if (commonFields) {
      const allowedCommonFields = [
        'invoiceNumber', 'invoiceDate', 'challanNumber', 'transportName',
        'truckNumber', 'grNumber', 'grDate', 'biltyNumber', 'receivedDate', 'remarks'
      ];
      for (const field of allowedCommonFields) {
        if (commonFields[field] !== undefined) {
          (entry as any)[field] = commonFields[field];
        }
      }
    }

    // Apply item-specific fields
    const itemFields = ['invoiceQty', 'challanQty', 'rejectedQty', 'rate', 'hsnCode', 'unit', 'srt', 'act', 'packingList'];
    for (const field of itemFields) {
      if (item[field] !== undefined) {
        (entry as any)[field] = item[field];
      }
    }

    entry.status = submissionStatus as any;
    entry.updatedBy = user._id;

    const updated = await entry.save();

    if (updated && (updated.status === 'Submitted' || updated.status === 'Approved') && originalStatus !== 'Submitted' && originalStatus !== 'Approved') {
      await processInwardStockUpdate(updated._id.toString());
    }

    results.push(updated);
  }

  res.status(200).json(new ApiResponse(200, results, `${results.length} entries updated successfully`));
});


export const voidInwardEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isAdmin = user?.role?.name === "Admin" || user?.role?.name === "Super Admin" || user?.role?.permissions?.includes("*");
  const { auditReason } = req.body;

  const entry = await StoreInwardEntry.findById(id);
  if (!entry) throw new ApiError(404, 'Store Inward Entry not found');
  if (entry.status === 'Voided') throw new ApiError(400, 'Entry is already voided');

  if (entry.status === 'Approved' || entry.status === 'Verified') {
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

  entry.status = 'Voided';
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
  if (entry.status !== 'Submitted' && entry.status !== 'Verified') return;
  
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


// ====== MHROV CONTROLLERS ======

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
        status: 'Submitted', // Move directly to SUBMITTED
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


// 
// NEW API: Query DI Line Items for MHROV
// 
