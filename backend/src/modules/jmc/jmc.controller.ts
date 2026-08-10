import { Request, Response } from 'express';
import { JmcRegister } from './jmc.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { asyncHandler } from '../../core/utils/asyncHandler';

export const createJmc = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const user = (req as any).user;

  const count = await JmcRegister.countDocuments();
  data.jmcNumber = `JMC/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
  data.createdBy = user._id;

  const newJmc = await JmcRegister.create(data);

  res.status(201).json(
    new ApiResponse(201, newJmc, 'JMC Register entry created successfully')
  );
});

export const getJmcs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = user.contractorId;
  }

  const jmcs = await JmcRegister.find(filter)
    .populate('contractorId', 'name vendorName')
    .populate('workOrderId', 'workOrderNumber')
    .sort({ createdAt: -1 });

  res.status(200).json(
    new ApiResponse(200, jmcs, 'JMC Register entries fetched successfully')
  );
});

export const getJmcById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const jmc = await JmcRegister.findById(id)
    .populate('contractorId', 'name vendorName')
    .populate('workOrderId', 'workOrderNumber');

  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, jmc, 'JMC Register entry fetched successfully')
  );
});

export const updateJmc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const jmc = await JmcRegister.findById(id);
  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  const updatedJmc = await JmcRegister.findByIdAndUpdate(
    id,
    data,
    { new: true, runValidators: true }
  );

  res.status(200).json(
    new ApiResponse(200, updatedJmc, 'JMC Register entry updated successfully')
  );
});

export const deleteJmc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const jmc = await JmcRegister.findByIdAndDelete(id);
  
  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'JMC Register entry deleted successfully')
  );
});
