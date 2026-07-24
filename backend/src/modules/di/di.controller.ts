import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { DI } from './di.schema';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse/sync';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { Pr } from '../purchases/pr.schema';
import mongoose from 'mongoose';
import { SummaryService } from '../reports/summary/summary.service';
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
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const diLetterCopyUrl = files?.['diLetterCopyUrl']?.[0]?.filename ? `/uploads/dis/${files['diLetterCopyUrl'][0].filename}` : undefined;
  const inspectionReportCopyUrl = files?.['inspectionReportCopyUrl']?.[0]?.filename ? `/uploads/dis/${files['inspectionReportCopyUrl'][0].filename}` : undefined;
  
  const diData = {
    ...data,
    lineItems: parsedLineItems,
    diLetterCopyUrl,
    inspectionReportCopyUrl
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [newDI] = await DI.create([diData], { session });

    // Update Item Summary (diQty)
    for (const item of newDI.lineItems) {
      if (!item.itemId) continue;
      await SummaryService.updateSummary({
        itemId: item.itemId.toString(),
        circle: item.circle || newDI.circle,
        package: item.package || newDI.package,
        increments: { diQty: item.quantity },
        session
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(
      new ApiResponse(201, newDI, 'DI Registered Successfully')
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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

  const diObj = di.toObject();
  
  // Check if linked to PR
  const hasPr = await Pr.exists({ diNo: di.diNumber });
  (diObj as any).isLocked = di.status === 'Received' || !!hasPr;

  res.status(200).json(
    new ApiResponse(200, diObj, 'DI fetched successfully')
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

  // Process new attachments
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (files?.['diLetterCopyUrl']?.[0]) {
    existingDI.diLetterCopyUrl = `/uploads/dis/${files['diLetterCopyUrl'][0].filename}`;
  }
  if (files?.['inspectionReportCopyUrl']?.[0]) {
    existingDI.inspectionReportCopyUrl = `/uploads/dis/${files['inspectionReportCopyUrl'][0].filename}`;
  }

  // Check if locked
  const hasPr = await Pr.exists({ diNo: existingDI.diNumber });
  const isLocked = existingDI.status === 'Received' || !!hasPr;

  if (isLocked) {
    // If locked, we ONLY allow updating notes or attachments (already processed above)
    if (data.notes !== undefined) existingDI.notes = data.notes;
    // Disallow line items, status changes, etc.
  } else {
    // Not locked, allow full update
    if (data.status) existingDI.status = data.status;
    if (data.notes !== undefined) existingDI.notes = data.notes;
    existingDI.lineItems = parsedLineItems;
  }

  const updatedDI = await existingDI.save();

  res.status(200).json(
    new ApiResponse(200, updatedDI, 'DI Updated Successfully')
  );
});

export const importDIs = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const parser = parseAndSanitizeCsv(req.file.buffer);

    const disMap: Record<string, any> = {};

    for await (const r of parser) {
      const row = r as Record<string, string>;
      const diNumber = row['DINumber'] || row['diNumber'] || row['DI Number'];
      if (!diNumber) continue;

      if (!disMap[diNumber]) {
        disMap[diNumber] = {
          diNumber,
          _poNumber: row['PurchaseOrderNumber'] || row['purchaseOrderNumber'] || '',
          date: row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
          circle: row['Circle'] || row['circle'],
          package: row['Package'] || row['package'],
          status: row['Status'] || row['status'] || 'Active',
          notes: row['Notes'] || row['notes'],
          lineItems: [],
        };
      }

      const itemName = row['ItemName'] || row['itemName'] || row['Item Name'];
      const quantity = Number(row['Quantity'] || row['quantity'] || 0);
      const tempCode = row['TempCode'] || row['tempCode'];
      const loaSerialNo = row['LoaSerialNo'] || row['loaSerialNo'];
      const itemPackage = row['ItemPackage'] || row['itemPackage'];
      const itemCircle = row['ItemCircle'] || row['itemCircle'];

      if (itemName) {
        disMap[diNumber].lineItems.push({
          itemName,
          tempCode,
          loaSerialNo,
          package: itemPackage,
          circle: itemCircle,
          quantity
        });
      }
    }

    let successCount = 0;
    const errors: any[] = [];
    
    for (const diNumber of Object.keys(disMap)) {
      const diData = disMap[diNumber];
      try {
        const existing = await DI.findOne({ diNumber: diData.diNumber });
        if (existing) {
          errors.push(`DI ${diData.diNumber} already exists.`);
          continue;
        }

        if (diData._poNumber) {
          const po = await PurchaseOrder.findOne({ purchaseOrderNumber: diData._poNumber });
          if (po) {
            diData.purchaseOrderId = po._id;
          } else {
            errors.push(`Purchase Order ${diData._poNumber} not found for DI ${diData.diNumber}. It will be created without PO link.`);
          }
        }
        delete diData._poNumber;

        await DI.create(diData);
        successCount++;
      } catch (err: any) {
        errors.push(`Failed to import DI ${diData.diNumber}: ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Import processed',
      data: {
        successCount,
        errors
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to import DI Registrations',
      error: error.message,
    });
  }
});

export const deleteDI = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const di = await DI.findById(id);
  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  const hasPr = await Pr.exists({ diNo: di.diNumber });
  if (di.status === 'Received' || hasPr) {
    throw new ApiError(400, 'Cannot delete this DI because it has already been Received or Invoiced.');
  }

  await DI.findByIdAndDelete(id);

  res.status(200).json(
    new ApiResponse(200, null, 'DI deleted successfully')
  );
});
