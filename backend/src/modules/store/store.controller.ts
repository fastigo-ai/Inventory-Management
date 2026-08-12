import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse';
import { StoreInwardEntry } from './storeInwardEntry.schema';
import { DI } from '../di/di.schema';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { PurchaseInvoice } from '../purchases/purchaseInvoice.schema';
import Item from '../items/item.model';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { ContractorReturn } from '../contractors/contractorReturn.schema';
import { StoreTransfer } from './storeTransfer.schema';
import { Mhrov } from './mhrov.schema';
import cloudinary from '../../core/utils/cloudinary';
import { SummaryService } from '../reports/summary/summary.service';

export const getPendingDIs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = { status: { $in: ['Active', 'Pending Receipt', 'Received'] } }; // Keeping old statuses temporarily for backward compatibility with existing DB entries
  
  const SUB_STORE_MAP: Record<string, string[]> = {
    'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
    'Nahan': ['Nahan'],
    'Rohru': ['Rohru'],
    'Rampur': ['Rampur'],
  };

  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) {
      const allowedCircles = SUB_STORE_MAP[user.assignedCircle] || [user.assignedCircle];
      filter.circle = { $in: allowedCircles };
    }
  }

  // Get all DIs matching the filter
  const dis = await DI.find(filter)
    .populate('purchaseOrderId', 'purchaseOrderNumber vendorName')
    .sort({ createdAt: -1 });

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
  const invoice = po ? await PurchaseInvoice.findOne({ purchaseOrderId: po._id }).sort({ createdAt: -1 }) : null;

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

  // Enforce 1 active inward entry per DI or PI
  const existingFilter: any = { status: { $ne: 'DRAFT' } };
  if (data.purchaseInvoiceId) {
    existingFilter.purchaseInvoiceId = data.purchaseInvoiceId;
  } else {
    existingFilter.diId = data.diId;
  }

  const existing = await StoreInwardEntry.findOne(existingFilter);

  if (existing) {
    throw new ApiError(400, 'A submitted Inward Entry already exists for this Invoice/DI');
  }

  // Truck number validation
  if (data.truckNumber) {
    const truckRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/i;
    if (!truckRegex.test(data.truckNumber.replace(/[\s-]/g, ''))) {
      throw new ApiError(400, 'Invalid Truck Number format');
    }
  }

  // Packing list validation
  if (data.status === 'SUBMITTED' && (!data.packingList || data.packingList.length === 0)) {
    throw new ApiError(400, 'Packing list must contain at least one item to submit');
  }

  let totalPackQty = 0;
  if (data.packingList) {
    data.packingList.forEach((pack: any) => {
      totalPackQty += Number(pack.quantity) || 0;
    });
  }

  if (data.status === 'SUBMITTED' && totalPackQty === 0) {
    throw new ApiError(400, 'Sum of packing list quantities must be > 0 to submit');
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

  // If DRAFT, we just upsert based on diId or purchaseInvoiceId
  const draftFilter: any = { status: 'DRAFT' };
  if (data.purchaseInvoiceId) {
    draftFilter.purchaseInvoiceId = data.purchaseInvoiceId;
  } else {
    draftFilter.diId = data.diId;
  }
  let entry = await StoreInwardEntry.findOne(draftFilter);
  
  data.createdBy = (req as any).user?._id;
  
  if (entry) {
    entry = await StoreInwardEntry.findByIdAndUpdate(entry._id, data, { new: true });
  } else {
    entry = await StoreInwardEntry.create(data);
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
  const { diId, status } = req.query;
  const filter: any = {};
  if (diId) filter.diId = diId;
  if (status) filter.status = status;
  
  const entries = await StoreInwardEntry.find(filter)
    .populate('diId', 'diNumber')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, entries, 'Entries fetched successfully')
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
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, entries, 'Admin entries fetched successfully')
  );
});

export async function buildStockSummaryData(circleFilter?: string, packageFilter?: string) {
  // Build filters for Inward, Assignments, Returns
  const inwardFilter: any = { status: 'VERIFIED' };
  if (circleFilter) inwardFilter.circle = circleFilter;
  if (packageFilter) inwardFilter.package = packageFilter;

  const assignmentFilter: any = { status: { $ne: 'Cancelled' } };

  const returnsFilter: any = {};
  if (circleFilter) returnsFilter.division = circleFilter;

  console.log("Fetching DB collections in parallel...");
  // Fetch all collections in parallel to massively improve performance (fixes Axios timeouts)
  const [
    items,
    verifiedInwards,
    assignments,
    contractorReturns,
    transfers
  ] = await Promise.all([
    Item.find({ isDeleted: false }),
    StoreInwardEntry.find(inwardFilter),
    ContractorAssignment.find(assignmentFilter),
    ContractorReturn.find(returnsFilter),
    StoreTransfer.find({ status: 'RECEIVED' })
  ]);
  console.log("Fetched all DB collections successfully!");

  // 5. Aggregate data per item
  const summaryMap: Record<string, any> = {};

  items.forEach(item => {
    const data = item.dynamicData || {};
    const tempCode = data.tempCode || data.temp_code || '';
    const activity = data.activity || data.itemActivity || 'Uncategorized Activity';
    
    summaryMap[tempCode] = {
      itemId: item._id,
      sr: 0,
      tempCode: tempCode,
      activity: activity,
      hsnCode: data.hsnCode || data.hsn_code || '-',
      description: data.name || data.description || '-',
      unit: data.unit || 'Nos',
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
      
      // Calculate derived fields (assuming rejectedQty is 0 for now)
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
        
        if (circleFilter && transfer.toStore === circleFilter) {
          summaryMap[tc].receivedFromOtherStore += rcvQty;
          summaryMap[tc].totalInStockAfterReceive = summaryMap[tc].acceptedQty + summaryMap[tc].receivedFromOtherStore;
        }

        if (circleFilter && transfer.fromStore === circleFilter) {
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
  const { circle, package: pkg } = req.query;
  const summary = await buildStockSummaryData(circle as string, pkg as string);
  res.status(200).json(new ApiResponse(200, summary, 'Stock summary fetched successfully'));
});

export const getAdminStockSummary = asyncHandler(async (req: Request, res: Response) => {
  const { circle, package: pkg } = req.query;
  const summary = await buildStockSummaryData(circle as string, pkg as string);
  res.status(200).json(new ApiResponse(200, summary, 'Admin stock summary fetched successfully'));
});

export const createStoreTransfer = asyncHandler(async (req: Request, res: Response) => {
  const transferData = req.body;
  transferData.requestedBy = (req as any).user?._id;
  
  const transfer = await StoreTransfer.create(transferData);
  res.status(201).json(new ApiResponse(201, transfer, 'Transfer request created successfully'));
});

export const getStoreTransfers = asyncHandler(async (req: Request, res: Response) => {
  const { circle } = req.query;
  
  let filter: any = {};
  if (circle) {
    filter = { $or: [{ fromStore: circle }, { toStore: circle }] };
  }

  const transfers = await StoreTransfer.find(filter)
    .populate('requestedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, transfers, 'Transfers fetched successfully'));
});

export const getStoreTransferById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const transfer = await StoreTransfer.findById(id).populate('requestedBy', 'firstName lastName');
  if (!transfer) throw new ApiError(404, 'Transfer not found');
  res.status(200).json(new ApiResponse(200, transfer, 'Transfer fetched successfully'));
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

  const inwardEntries: any[] = [];
  const session = await mongoose.startSession();
  session.startTransaction();

  const errors: string[] = [];
  let successCount = 0;

  try {

  for await (const row of parser) {
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
        // Try to match by loaSerialNo on PI items? PI items don't have loaSerialNo natively stored unless joined
        // Let's just find an item that matches the name if loa isn't perfect, or just use the first item if 1
        invoiceItem = invoice.lineItems.find((li: any) => li.itemName === itemName);
      }
      
      if (!invoiceItem && invoice.lineItems.length === 1) {
        invoiceItem = invoice.lineItems[0];
      }

      if (!invoiceItem && itemName) {
         invoiceItem = invoice.lineItems.find((li: any) => li.itemName?.toLowerCase().includes(itemName.toLowerCase()));
      }

      if (!invoiceItem) {
        errors.push(`Item '${itemName}' not found in Invoice ${invoiceNumber}`);
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
      
      if (acceptedQty <= 0) {
        errors.push(`Accepted Qty must be > 0 for Invoice ${invoiceNumber}`);
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

      const payload = {
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
        rate: rate,
        amount: amount,
        taxableAmount: taxableAmount,
        tempCode: row['TempCode'] || (invoiceItem.itemId ? undefined : undefined), 
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
        circle: row['Circle'] || poItem?.circle || '',
        package: row['Package'] || poItem?.package || '',
        serialNumber: row['SerialNumber'] || loaSerialNo || poItem?.loaSerialNo || invoiceItem.itemName,
        status: 'DRAFT',
        packingList: [],
        createdBy: (req as any).user?._id
      };
      
      // If DRAFT exists for this PI and serialNumber, update it, else create
      const draftFilter: any = { 
        status: 'DRAFT',
        purchaseInvoiceId: invoice._id,
        serialNumber: payload.serialNumber
      };
      
      let entry = await StoreInwardEntry.findOne(draftFilter).session(session);
      if (entry) {
        await StoreInwardEntry.findByIdAndUpdate(entry._id, payload, { session });
      } else {
        await StoreInwardEntry.create([payload], { session });
      }
      
      successCount++;
    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  if (errors.length > 0) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row errors. No data was imported.')
    );
  }

  await session.commitTransaction();
  session.endSession();

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed')
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
      baseFilter.circle = { $regex: new RegExp(`^\\s*${user.assignedCircle.trim()}\\s*$`, 'i') };
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
      filter.circle = { $regex: new RegExp(`^\\s*${user.assignedCircle.trim()}\\s*$`, 'i') };
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
    filter.$or.push(
      { invoiceNumber: { $regex: searchStr, $options: 'i' } },
      { poNumber: { $regex: searchStr, $options: 'i' } }
    );
  }

  if (itemTemp) {
    const searchStr = itemTemp as string;
    filter.$or = filter.$or || [];
    filter.$or.push(
      { itemName: { $regex: searchStr, $options: 'i' } },
      { tempCode: { $regex: searchStr, $options: 'i' } }
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
    .sort({ createdAt: -1 });

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
  
  const filter: any = { 
    status: { $in: ['APPROVED', 'VERIFIED', 'INWARDED', 'SUBMITTED'] }, 
    purchaseInvoiceId: { $exists: true } 
  };
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    if (user.assignedCircle) {
      filter.circle = { $regex: new RegExp(`^\\s*${user.assignedCircle.trim()}\\s*$`, 'i') };
    }
  }

  if (req.query.search) {
    filter.inwardId = { $regex: req.query.search as string, $options: 'i' };
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

  // validations...
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
  }

  // Remove fields that shouldn't be overwritten directly or handle them carefully
  delete payload.auditLogs;
  if (payload.status && !isAdmin && (entry.status === 'APPROVED' || entry.status === 'VERIFIED')) {
    delete payload.status;
  }

  payload.updatedBy = user._id;

  Object.assign(entry, payload);
  const updated = await entry.save();
  
  if (updated && updated.status === 'SUBMITTED' && originalStatus !== 'SUBMITTED') {
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

async function processInwardStockUpdate(entryId: string) {
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
          ...(entry.itemDescription && { description: entry.itemDescription }),
          ...(circleKey && { [circleKey]: Number(item.dynamicData?.[circleKey] || 0) + qtyToAdd })
        };
        item.markModified('dynamicData');
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

              const circleKey = circle && circle !== 'Default' ? `${circle.toLowerCase().replace(/\s+/g, '')}LoaQuantity` : null;

              item.dynamicData = {
                ...item.dynamicData,
                stock: currentStock + qtyToAdd,
                stockLocations: locations,
                purchaseHistory: history,
                ...(lineItem.tempCode && { tempCode: lineItem.tempCode }),
                ...(lineItem.loaSerialNo && { loaSerialNo: lineItem.loaSerialNo }),
                ...(lineItem.hsnCode && { hsnCode: lineItem.hsnCode }),
                ...(lineItem.itemDescription && { description: lineItem.itemDescription }),
                ...(circleKey && { [circleKey]: Number(item.dynamicData?.[circleKey] || 0) + qtyToAdd })
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
          purchaseHistory: history,
          ...(circleKey && { [circleKey]: Math.max(0, Number(item.dynamicData?.[circleKey] || 0) - qtyToSubtract) })
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
              purchaseHistory: history,
              ...(circleKey && { [circleKey]: Math.max(0, Number(item.dynamicData?.[circleKey] || 0) - qtyToSubtract) })
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

  for await (const row of parser) {
    try {
      const docKey = row['ChallanNo'] || row['Challan No'] || row['MinNo'] || row['MIN No'] || '';
      if (!docKey) {
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
      if (tempCode) {
        item = await Item.findOne({ itemCode: tempCode });
      }
      if (!item && itemName) {
        item = await Item.findOne({ description: { $regex: new RegExp(`^${itemName}$`, 'i') } });
      }

      if (!item) {
         errors.push(`Item '${itemName || tempCode}' not found for Transfer ${docKey}`);
         continue;
      }

      const requestedQty = Number(row['RequestedQty'] || row['Transfer Qty'] || row['TransferQty'] || 0);
      const dispatchedQty = Number(row['DispatchedQty'] || row['Transfer Qty'] || row['TransferQty'] || requestedQty);
      const receivedQty = Number(row['ReceivedQty'] || dispatchedQty);

      if (dispatchedQty <= 0) {
        errors.push(`Row has zero Transfer Qty for Transfer ${docKey}`);
        continue;
      }

      const unit = row['Unit'] || item?.unit || 'Nos';

      const lineItem = {
        itemId: item._id,
        tempCode: item.itemCode || tempCode || '',
        description: item.description || itemName || '',
        unit,
        requestedQty,
        dispatchedQty,
        receivedQty
      };

      if (!transfersByDoc[docKey]) {
        transfersByDoc[docKey] = {
          requestDate: row['Date'] ? new Date(row['Date']) : new Date(),
          status: 'IN_TRANSIT',
          fromStore: row['From'] || row['FromStore'] || 'Unknown Store',
          toStore: row['To'] || row['ToStore'] || 'Unknown Store',
          requestedBy: user ? user._id : null,
          vendorName: row['Name of Vendor'] || row['VendorName'] || '',
          
          minBookNo: row['MIN BOOK No'] || row['MinBookNo'] || '',
          minNo: row['MIN No'] || row['MinNo'] || '',
          minDate: row['MIN Date'] ? new Date(row['MIN Date']) : undefined,
          
          challanNo: row['Challan No'] || row['ChallanNo'] || '',
          challanDate: row['Challan Date'] ? new Date(row['Challan Date']) : undefined,
          
          transportName: row['Transport'] || row['TransportName'] || '',
          truckNumber: row['Truck No'] || row['TruckNumber'] || '',
          grNumber: row['GR No'] || row['GrNumber'] || '',
          grDate: row['GR Date'] ? new Date(row['GR Date']) : undefined,
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Save transfers
    for (const docKey of Object.keys(transfersByDoc)) {
    const payload = transfersByDoc[docKey];
    
    // Check if transfer already exists based on ChallanNo or MinNo
    const existing = await StoreTransfer.findOne({ 
       $or: [
         { challanNo: { $eq: payload.challanNo, $ne: '' } },
         { minNo: { $eq: payload.minNo, $ne: '' } }
       ]
    });
    
    if (existing) {
      errors.push(`Transfer ${payload.challanNo || payload.minNo} already exists. Skipping.`);
      continue;
    }

    try {
      await StoreTransfer.create([payload], { session });
      successCount++;
    } catch (err: any) {
      errors.push(`Error saving Transfer ${docKey}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row errors. No data was imported.')
    );
  }

  await session.commitTransaction();
  session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed')
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

  for await (const row of parser) {
    try {
      const docKey = row['Challan No'] || row['ChallanNo'] || row['MIN No.'] || row['MIN No'] || '';
      if (!docKey) {
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
      if (tempCode) {
        item = await Item.findOne({ itemCode: tempCode });
      }
      if (!item && itemName) {
        item = await Item.findOne({ description: { $regex: new RegExp(`^${itemName}$`, 'i') } });
      }

      if (!item) {
         errors.push(`Item '${itemName || tempCode}' not found for Transfer ${docKey}`);
         continue;
      }

      const receivedQty = Number(row['Received Qty'] || 0);

      if (receivedQty <= 0) {
        errors.push(`Row has zero Received Qty for Transfer ${docKey}`);
        continue;
      }

      const unit = row['Unit'] || item?.unit || 'Nos';

      const lineItem = {
        itemId: item._id,
        tempCode: item.itemCode || tempCode || '',
        description: item.description || itemName || '',
        unit,
        requestedQty: receivedQty,
        dispatchedQty: receivedQty,
        receivedQty
      };

      if (!transfersByDoc[docKey]) {
        transfersByDoc[docKey] = {
          requestDate: row['Date of Received'] ? new Date(row['Date of Received']) : new Date(),
          status: 'RECEIVED',
          fromStore: row['From'] || 'Unknown Store',
          toStore: row['To'] || 'Unknown Store',
          requestedBy: user ? user._id : null,
          vendorName: row['Name of Vendor'] || '',
          
          minBookNo: row['MIN BOOK No.'] || row['MIN BOOK No'] || '',
          minNo: row['MIN No.'] || row['MIN No'] || '',
          minDate: row['MIN Date'] ? new Date(row['MIN Date']) : undefined,
          
          challanNo: row['Challan No'] || '',
          challanDate: row['Challan Date'] ? new Date(row['Challan Date']) : undefined,
          
          transportName: row['Transport'] || '',
          truckNumber: row['Truck No'] || '',
          grNumber: row['GR No'] || '',
          grDate: row['Date'] ? new Date(row['Date']) : undefined,
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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
        continue;
      }

      try {
        await StoreTransfer.create([payload], { session });
        successCount++;
      } catch (err: any) {
        errors.push(`Error saving Transfer ${docKey}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json(
        new ApiResponse(400, { errors }, 'Import failed due to row errors. No data was imported.')
      );
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed')
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

export const createMhrov = asyncHandler(async (req: Request, res: Response) => {
  const { mhrovNumber, mhrovDate, status, inwardEntries } = req.body;
  const user = (req as any).user;
  
  const parsedInwardEntries = inwardEntries ? (typeof inwardEntries === 'string' ? JSON.parse(inwardEntries) : inwardEntries) : [];

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
    package: user?.assignedPackage,
    circle: user?.assignedCircle,
    createdBy: user?._id
  });

  await mhrov.save();

  res.status(201).json(new ApiResponse(201, mhrov, 'MHROV created successfully'));
});

export const getMhrovs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) filter.circle = user.assignedCircle;
  }

  const mhrovs = await Mhrov.find(filter).populate("inwardEntries", "invoiceNumber").sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, mhrovs, 'MHROVs fetched successfully'));
});

export const updateMhrov = asyncHandler(async (req: Request, res: Response) => {
  const { mhrovNumber, mhrovDate, status, inwardEntries } = req.body;
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

  const parsedInwardEntries = inwardEntries ? (typeof inwardEntries === 'string' ? JSON.parse(inwardEntries) : inwardEntries) : mhrov.inwardEntries;

  let documentUrl = mhrov.documentUrl;
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'mhrov-documents');
    documentUrl = result.secure_url;
  }

  mhrov.mhrovNumber = mhrovNumber || mhrov.mhrovNumber;
  mhrov.mhrovDate = mhrovDate || mhrov.mhrovDate;
  mhrov.status = status || mhrov.status;
  mhrov.documentUrl = documentUrl;
  mhrov.inwardEntries = parsedInwardEntries;

  await mhrov.save();

  res.status(200).json(new ApiResponse(200, mhrov, 'MHROV updated successfully'));
});

export const getMhrovById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const mhrov = await Mhrov.findById(id).populate({
    path: 'inwardEntries',
    populate: { path: 'diId' }
  });

  if (!mhrov) {
    throw new ApiError(404, 'MHROV not found');
  }

  res.status(200).json(new ApiResponse(200, mhrov, 'MHROV fetched successfully'));
});


export const getMhrovDashboardData = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = { status: 'VERIFIED' };
  const mhrovFilter: any = {};
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) {
      filter.package = user.assignedPackage;
      mhrovFilter.package = user.assignedPackage;
    }
    if (user.assignedCircle) {
      filter.circle = user.assignedCircle;
      mhrovFilter.circle = user.assignedCircle;
    }
  }

  // 1. Fetch all VERIFIED Inward Entries
  const inwardEntries = await StoreInwardEntry.find(filter)
    .populate('diId', 'diNumber')
    .sort({ createdAt: -1 })
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
  });

  // 4. Merge data and calculate metrics
  let totalItems = 0;
  let doneCount = 0;
  let pendingCount = 0;
  let doneNotSignedCount = 0;
  let notStartedCount = 0;

  const mergedItems = inwardEntries.map(entry => {
    totalItems++;
    const mhrovData = inwardToMhrovMap.get(entry._id.toString());
    
    if (mhrovData) {
      if (mhrovData.status === 'done') doneCount++;
      else if (mhrovData.status === 'pending') pendingCount++;
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const row of entries) {
    try {
      const entryId = row['Entry ID'];
      if (!entryId) {
        results.failed++;
        results.errors.push('Missing Entry ID in row');
        continue;
      }

      const existingEntry = await StoreInwardEntry.findById(entryId).session(session);
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

      await StoreInwardEntry.findByIdAndUpdate(entryId, updateData, { session });
      
      // Also invoke summary rebuild just like manual update
      if (existingEntry.itemId) {
        SummaryService.rebuildForItem(existingEntry.itemId.toString()).catch(console.error);
      }

      results.success++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Row processing failed: ${err.message}`);
    }
  }

  if (results.errors.length > 0) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json(
      new ApiResponse(400, { results }, 'Bulk import failed due to row errors. No entries were updated.')
    );
  }

  await session.commitTransaction();
  session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  res.status(200).json(
    new ApiResponse(200, results, 'Bulk import completed')
  );
});
