import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { DI } from './di.schema';

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
