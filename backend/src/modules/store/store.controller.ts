import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { StoreInwardEntry } from './storeInwardEntry.schema';
import { DI } from '../di/di.schema';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { PurchaseInvoice } from '../purchases/purchaseInvoice.schema';

export const getPendingDIs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = { status: { $in: ['Pending Receipt', 'Received'] } };
  
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
  const poItem = po.lineItems.find(li => li.itemId?.toString() === item?.itemId?.toString() || li.tempCode === item?.tempCode);
  const invoiceItem = invoice?.lineItems?.find(li => li.itemId?.toString() === item?.itemId?.toString());

  const prefillData = {
    diId: di._id,
    purchaseOrderId: po._id,
    poNumber: po.purchaseOrderNumber,
    billingFrom: po.billingCompany?.name,
    vendorName: po.vendorName,
    unit: poItem?.unit || 'Nos',
    invoiceQty: invoiceItem ? invoiceItem.quantity : (item?.quantity || poItem?.quantity || 0),
    rate: invoiceItem ? invoiceItem.rate : (poItem?.rate || 0),
    amount: invoiceItem ? invoiceItem.amount : (poItem?.amount || 0),
    hsnCode: invoiceItem ? invoiceItem.hsnCode : poItem?.hsnCode,
    gst: po.cgstPercentage ? `${(po.cgstPercentage * 2)}%` : po.igstPercentage ? `${po.igstPercentage}%` : '',
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
  
  if (!data.diId) {
    throw new ApiError(400, 'DI ID is required');
  }

  // Enforce 1 active inward entry per DI
  const existing = await StoreInwardEntry.findOne({
    diId: data.diId,
    status: { $ne: 'DRAFT' } // If it's already submitted or verified
  });

  if (existing) {
    throw new ApiError(400, 'A submitted Inward Entry already exists for this DI');
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

  // If DRAFT, we just upsert based on diId
  let entry = await StoreInwardEntry.findOne({ diId: data.diId, status: 'DRAFT' });
  
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

  if (entry.status !== 'DRAFT') {
    // Allow status updates for admin/verification
    if (data.status === 'VERIFIED' || data.status === 'NEEDS_CORRECTION') {
      const updated = await StoreInwardEntry.findByIdAndUpdate(id, { status: data.status }, { new: true });
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
