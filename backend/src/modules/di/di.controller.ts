import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { DI } from './di.schema';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';

export const createDI = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;

  // Parse lineItems if they come as string from multipart/form-data
  let parsedLineItems = data.lineItems || [];
  if (typeof parsedLineItems === 'string') {
    try {
      parsedLineItems = JSON.parse(parsedLineItems);
    } catch (e) {
      parsedLineItems = [];
    }
  }

  // Process attachments
  const files = req.files as Express.Multer.File[];
  const attachments = files ? files.map(file => ({
    name: file.originalname,
    url: `/uploads/dis/${file.filename}`
  })) : [];
  
  const diData = {
    ...data,
    lineItems: parsedLineItems,
    attachments
  };
  
  // Basic validation
  if (!diData.diNumber || !diData.purchaseOrderId || !diData.lineItems || diData.lineItems.length === 0) {
    throw new ApiError(400, 'DI Number, Purchase Order, and Line Items are required');
  }

  // Check if DI number already exists
  const existingDI = await DI.findOne({ diNumber: diData.diNumber });
  if (existingDI) {
    throw new ApiError(400, 'DI Number already exists');
  }

  const newDI = await DI.create(diData);

  res.status(201).json(
    new ApiResponse(201, newDI, 'DI Registered Successfully')
  );
});

export const getDIs = asyncHandler(async (req: Request, res: Response) => {
  const { purchaseOrderId, status } = req.query;
  const user = (req as any).user;
  const filter: any = {};
  
  if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
  if (status) filter.status = status;

  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) filter.circle = user.assignedCircle;
  }

  const dis = await DI.find(filter)
    .populate('purchaseOrderId', 'purchaseOrderNumber vendorName')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, dis, 'DIs fetched successfully')
  );
});

export const getDIById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const di = await DI.findById(id).populate('purchaseOrderId');
  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  res.status(200).json(
    new ApiResponse(200, di, 'DI fetched successfully')
  );
});

export const updateDIStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const di = await DI.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  res.status(200).json(
    new ApiResponse(200, di, 'DI status updated successfully')
  );
});

export const receiveDI = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const di = await DI.findById(id);

  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  if (di.status === 'Received') {
    throw new ApiError(400, 'DI has already been received');
  }

  di.status = 'Received';
  await di.save();

  // In a full implementation, we would increment the inventory for the specific items here.
  // We'll leave the inventory adjustment logic stubbed out since inventory is metadata driven.

  res.status(200).json(
    new ApiResponse(200, di, 'DI Received Successfully')
  );
});

export const updateDI = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const existingDI = await DI.findById(id);
  if (!existingDI) {
    throw new ApiError(404, 'DI not found');
  }

  // Parse lineItems if they come as string from multipart/form-data
  let parsedLineItems = data.lineItems || [];
  if (typeof parsedLineItems === 'string') {
    try {
      parsedLineItems = JSON.parse(parsedLineItems);
    } catch (e) {
      parsedLineItems = [];
    }
  }

  // Parse existingAttachments if they come as string
  let existingAttachments = data.existingAttachments || [];
  if (typeof existingAttachments === 'string') {
    try {
      existingAttachments = JSON.parse(existingAttachments);
    } catch (e) {
      existingAttachments = [];
    }
  }

  // Process new attachments
  const files = req.files as Express.Multer.File[];
  const newAttachments = files ? files.map(file => ({
    name: file.originalname,
    url: `/uploads/dis/${file.filename}`
  })) : [];
  
  const mergedAttachments = [...existingAttachments, ...newAttachments];

  const updateData = {
    ...data,
    lineItems: parsedLineItems,
    attachments: mergedAttachments
  };

  const updatedDI = await DI.findByIdAndUpdate(id, updateData, { new: true });

  res.status(200).json(
    new ApiResponse(200, updatedDI, 'DI Updated Successfully')
  );
});

export const exportDIs = asyncHandler(async (req: Request, res: Response) => {
  const dis = await DI.find().populate('purchaseOrderId', 'purchaseOrderNumber').sort({ createdAt: -1 }).lean();
  
  const rows: any[] = [];
  for (const di of dis) {
    if (!di.lineItems || di.lineItems.length === 0) {
      rows.push({
        DINumber: di.diNumber,
        Date: di.date,
        PONumber: (di.purchaseOrderId as any)?.purchaseOrderNumber || '',
        Circle: di.circle || '',
        Package: di.package || '',
        Status: di.status,
        Notes: di.notes || '',
        ItemName: '',
        TempCode: '',
        ItemPackage: '',
        ItemCircle: '',
        Quantity: ''
      });
    } else {
      for (const item of di.lineItems) {
        rows.push({
          DINumber: di.diNumber,
          Date: di.date,
          PONumber: (di.purchaseOrderId as any)?.purchaseOrderNumber || '',
          Circle: di.circle || '',
          Package: di.package || '',
          Status: di.status,
          Notes: di.notes || '',
          ItemName: item.itemName || '',
          TempCode: item.tempCode || '',
          ItemPackage: item.package || '',
          ItemCircle: item.circle || '',
          Quantity: item.quantity || 0
        });
      }
    }
  }

  const headers = ['DINumber', 'Date', 'PONumber', 'Circle', 'Package', 'Status', 'Notes', 'ItemName', 'TempCode', 'ItemPackage', 'ItemCircle', 'Quantity'];
  const csv = stringify(rows, { header: true, columns: headers });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="dis_export.csv"');
  res.send(csv);
});

export const importDIs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No CSV file uploaded');
  }

  const parser = parse(req.file.buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const disMap: Record<string, any> = {};

  for await (const row of parser) {
    const diNumber = row['DINumber'] || row['diNumber'] || row['DI Number'];
    if (!diNumber) continue;

    if (!disMap[diNumber]) {
      let poId = null;
      if (row['PONumber'] || row['poNumber']) {
        const poNum = row['PONumber'] || row['poNumber'];
        const po = await PurchaseOrder.findOne({ purchaseOrderNumber: poNum });
        if (po) poId = po._id;
      }
      
      disMap[diNumber] = {
        diNumber: diNumber,
        date: row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
        purchaseOrderId: poId,
        circle: row['Circle'] || row['circle'],
        package: row['Package'] || row['package'],
        status: row['Status'] || row['status'] || 'Draft',
        notes: row['Notes'] || row['notes'],
        lineItems: [],
      };
    }

    const itemName = row['ItemName'] || row['itemName'] || row['Item Name'];
    const tempCode = row['TempCode'] || row['tempCode'];
    const itemPackage = row['ItemPackage'] || row['itemPackage'];
    const itemCircle = row['ItemCircle'] || row['itemCircle'];
    const quantity = Number(row['Quantity'] || row['quantity'] || 0);

    if (itemName && quantity > 0) {
      disMap[diNumber].lineItems.push({
        itemName,
        tempCode,
        package: itemPackage,
        circle: itemCircle,
        quantity
      });
    }
  }

  const disToInsert = Object.values(disMap);
  let successCount = 0;
  const errors: any[] = [];
  
  for (const diData of disToInsert) {
     try {
       const existing = await DI.findOne({ diNumber: diData.diNumber });
       if (existing) {
         errors.push(`DI ${diData.diNumber} already exists.`);
         continue;
       }
       await DI.create(diData);
       successCount++;
     } catch (err: any) {
       errors.push(`Failed to import DI ${diData.diNumber}: ${err.message}`);
     }
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import processed')
  );
});
