import { Request, Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { ContractorWorkOrder } from './contractorWorkOrder.schema';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import mongoose from 'mongoose';

// Utility to generate next WO number
const generateNextWoNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `WO-${year}${month}-`;
  
  const lastWo = await ContractorWorkOrder.findOne({ workOrderNumber: new RegExp(`^${prefix}`) })
    .sort({ workOrderNumber: -1 })
    .limit(1);

  let sequence = 1;
  if (lastWo && lastWo.workOrderNumber) {
    const lastSequence = parseInt(lastWo.workOrderNumber.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

export const createWorkOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  
  const workOrderNumber = await generateNextWoNumber();
  
  const payload = {
    ...req.body,
    workOrderNumber,
    createdBy: user._id,
  };

  const workOrder = await ContractorWorkOrder.create(payload);
  res.status(201).json(new ApiResponse(201, workOrder, 'Contractor Work Order created successfully'));
});

export const getWorkOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 50, package: pkg, circle, search } = req.query;
  const filter: any = {};

  if (pkg) filter.package = pkg;
  if (circle) filter.circle = circle;
  if (search) {
    filter.workOrderNumber = { $regex: search, $options: 'i' };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await ContractorWorkOrder.countDocuments(filter);
  
  const workOrders = await ContractorWorkOrder.find(filter)
    .populate('contractorId', 'dynamicData.contractorName')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: {
      data: workOrders,
      pagination: {
        totalItems: total,
        currentPage: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    },
    message: 'Work Orders fetched successfully'
  });
});

export const getWorkOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    throw new ApiError(400, 'Invalid Work Order ID');
  }

  const workOrder = await ContractorWorkOrder.findById(id)
    .populate('contractorId', 'dynamicData.contractorName location')
    .populate('createdBy', 'firstName lastName');
    
  if (!workOrder) {
    throw new ApiError(404, 'Work Order not found');
  }

  res.status(200).json(new ApiResponse(200, workOrder, 'Work Order fetched successfully'));
});
