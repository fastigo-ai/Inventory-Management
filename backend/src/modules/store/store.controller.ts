import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { parse } from 'csv-parse';
import { StoreInwardEntry } from './storeInwardEntry.schema';
import { DI } from '../di/di.schema';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { PurchaseInvoice } from '../purchases/purchaseInvoice.schema';
import Item from '../items/item.model';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { StoreTransfer } from './storeTransfer.schema';

export const getPendingDIs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = { status: { $in: ['Active', 'Pending Receipt', 'Received'] } }; // Keeping old statuses temporarily for backward compatibility with existing DB entries
  
  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) filter.circle = user.assignedCircle;
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

  const po = await PurchaseOrder.findById(di.purchaseOrderId);
  if (!po) {
    throw new ApiError(404, 'Purchase Order not found');
  }

  // Find if there's any matching Purchase Invoice for this PO
  const invoice = await PurchaseInvoice.findOne({ purchaseOrderId: po._id }).sort({ createdAt: -1 });

  // Get the first item from DI to map properties (assuming 1 item per DI typically, or sum them)
  const item = di.lineItems[0];
  const poItem = po.lineItems.find((li: any) => li.itemId?.toString() === item?.itemId?.toString() || li.tempCode === item?.tempCode);
  const invoiceItem = invoice?.lineItems?.find((li: any) => li.itemId?.toString() === item?.itemId?.toString());

  const prefillData = {
    diId: di._id,
    purchaseOrderId: po._id,
    poNumber: po.purchaseOrderNumber,
    poDate: po.date,
    billingFrom: po.billingCompany?.name,
    vendorName: po.vendorName,
    unit: poItem?.unit || 'Nos',
    invoiceQty: invoiceItem ? invoiceItem.quantity : (item?.quantity || poItem?.quantity || 0),
    totalQty: poItem?.quantity || item?.quantity || 0,
    rate: invoiceItem ? invoiceItem.rate : (poItem?.rate || 0),
    amount: invoiceItem ? invoiceItem.amount : (poItem?.amount || 0),
    taxableAmount: invoiceItem ? invoiceItem.amount : (poItem?.amount || 0),
    hsnCode: invoiceItem ? invoiceItem.hsnCode : poItem?.hsnCode,
    gst: po.cgstPercentage ? `${(po.cgstPercentage * 2)}%` : po.igstPercentage ? `${po.igstPercentage}%` : '',
    cgst: po.cgstPercentage || 0,
    sgst: po.sgstPercentage || 0,
    igst: po.igstPercentage || 0,
    invoiceDate: invoice?.date,
    diRefNo: di.diNumber, // Usually DI number is the ref no
    circle: di.circle,
    package: di.package,
    serialNumber: poItem?.loaSerialNo || item?.tempCode || '',
    matchedInvoiceNumber: invoice?.invoiceNumber || null,
    matchedInvoiceId: invoice?._id || null
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

export const updateInwardEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  
  const entry = await StoreInwardEntry.findById(id);
  if (!entry) {
    throw new ApiError(404, 'Entry not found');
  }

  if (entry.status !== 'DRAFT' && entry.status !== 'PENDING_RECEIPT' && entry.status !== 'APPROVED') {
    // Allow status updates for admin/verification
    if (data.status === 'VERIFIED' || data.status === 'NEEDS_CORRECTION') {
      const updated = await StoreInwardEntry.findByIdAndUpdate(id, { status: data.status }, { new: true });
      
      // Update inventory and invoice receipt status if verified (legacy)
      if (data.status === 'VERIFIED' && updated && updated.purchaseInvoiceId) {
        await processInwardStockUpdate(updated._id.toString());
      }
      
      return res.status(200).json(new ApiResponse(200, updated, `Status updated to ${data.status}`));
    }
    throw new ApiError(400, 'Cannot fully update a non-draft entry via this endpoint');
  }

  // validations...
  if (data.status === 'SUBMITTED') {
    let totalPackQty = 0;
    if (data.packingList) {
      data.packingList.forEach((pack: any) => {
        totalPackQty += Number(pack.quantity) || 0;
      });
    }
    if (totalPackQty === 0) {
      throw new ApiError(400, 'Sum of packing list quantities must be > 0 to submit');
    }
  }

  data.updatedBy = (req as any).user?._id;
  const updated = await StoreInwardEntry.findByIdAndUpdate(id, data, { new: true });

  if (updated && updated.status === 'SUBMITTED') {
    await processInwardStockUpdate(updated._id.toString());
  }

  res.status(200).json(
    new ApiResponse(200, updated, 'Entry updated successfully')
  );
});

export const getInwardEntryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const entry = await StoreInwardEntry.findById(id)
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
  
  const entries = await StoreInwardEntry.find(filter).sort({ createdAt: -1 });

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
  // 1. Fetch all items
  const items = await Item.find({ isDeleted: false });

  // 2. Build filters for Inward and Assignments
  const inwardFilter: any = { status: 'VERIFIED' };
  if (circleFilter) inwardFilter.circle = circleFilter;
  if (packageFilter) inwardFilter.package = packageFilter;

  const assignmentFilter: any = { status: { $ne: 'Cancelled' } };
  // If contractor assignment schema had circle/package we would filter it here.
  // Assuming it does not or it's implicitly mapped via item's circle/package later.

  // 3. Fetch verified inwards
  const verifiedInwards = await StoreInwardEntry.find(inwardFilter);

  // 4. Fetch assignments
  const assignments = await ContractorAssignment.find(assignmentFilter);

  // 4.5 Fetch completed transfers
  const transfers = await StoreTransfer.find({ status: 'RECEIVED' });

  // 5. Aggregate data per item
  const summaryMap: Record<string, any> = {};

  items.forEach(item => {
    const data = item.dynamicData || {};
    const tempCode = data.tempCode || data.temp_code || '';
    
    summaryMap[tempCode] = {
      itemId: item._id,
      sr: 0,
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
        // Derived fields
        summaryMap[tc].contractorsActualIssued = summaryMap[tc].contractorsIssuedQty - summaryMap[tc].contractorsReturnQty;
      }
    });
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
        remarks: 'Sample Mock Data'
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
        remarks: 'Site Alpha'
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

  const parser = parse(req.file.buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const inwardEntries: any[] = [];
  const errors: string[] = [];
  let successCount = 0;

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

      const rate = invoiceItem.rate || 0;
      const taxableAmount = acceptedQty * rate;
      
      const cgstRate = invoice.cgstPercentage || 0;
      const sgstRate = invoice.sgstPercentage || 0;
      const igstRate = invoice.igstPercentage || 0;
      
      const cgst = (taxableAmount * cgstRate) / 100;
      const sgst = (taxableAmount * sgstRate) / 100;
      const igst = (taxableAmount * igstRate) / 100;
      const amount = taxableAmount + cgst + sgst + igst;

      const payload = {
        purchaseInvoiceId: invoice._id,
        purchaseOrderId: po?._id,
        poNumber: po?.purchaseOrderNumber || '',
        poDate: po?.date,
        billingFrom: invoice.billingCompany?.name || po?.billingCompany?.name || '',
        vendorName: invoice.vendorName || po?.vendorName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.date,
        receivedDate: row['ReceivedDate'] ? new Date(row['ReceivedDate']) : new Date(),
        unit: itemUnit,
        invoiceQty: acceptedQty,
        totalQty: poItem ? poItem.quantity : invoiceItem.quantity,
        challanQty: challanQty,
        rejectedQty: rejectedQty,
        rate: rate,
        amount: amount,
        taxableAmount: taxableAmount,
        tempCode: invoiceItem.itemId ? undefined : undefined, 
        hsnCode: invoiceItem.hsnCode || poItem?.hsnCode || '',
        challanNumber: row['ChallanNumber'] || '',
        transportName: row['TransportName'] || '',
        truckNumber: row['TruckNumber'] || '',
        grNumber: row['GrNumber'] || '',
        grDate: row['GrDate'] ? new Date(row['GrDate']) : undefined,
        biltyNumber: row['BiltyNumber'] || '',
        gst: invoice.cgstPercentage ? `${(invoice.cgstPercentage * 2)}%` : invoice.igstPercentage ? `${invoice.igstPercentage}%` : '',
        cgst: cgst,
        sgst: sgst,
        igst: igst,
        diRefNo: '',
        remarks: row['Remarks'] || '',
        circle: poItem?.circle || '',
        package: poItem?.package || '',
        serialNumber: loaSerialNo || poItem?.loaSerialNo || invoiceItem.itemName,
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
      
      let entry = await StoreInwardEntry.findOne(draftFilter);
      if (entry) {
        await StoreInwardEntry.findByIdAndUpdate(entry._id, payload);
      } else {
        await StoreInwardEntry.create(payload);
      }
      
      successCount++;
    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed')
  );
});

export const getPendingStoreReceipts = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  
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
  }

  const entries = await StoreInwardEntry.find(filter)
    .populate('purchaseInvoiceId')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, entries, 'Pending store receipts fetched successfully')
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
        await item.save();
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
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to update inventory stock on inward processing:', err);
  }
}
