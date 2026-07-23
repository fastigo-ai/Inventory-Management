import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { Contractor } from './contractor.schema';
import { ContractorAssignment } from './contractorAssignment.schema';

export const getContractors = asyncHandler(async (req: Request, res: Response) => {
  const { location } = req.query;
  const filter: any = { isActive: true };
  
  if (location) {
    filter.location = location;
  }

  const contractors = await Contractor.find(filter).sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, contractors, 'Contractors fetched successfully'));
});

export const createContractor = asyncHandler(async (req: Request, res: Response) => {
  const contractor = await Contractor.create(req.body);
  res.status(201).json(new ApiResponse(201, contractor, 'Contractor created successfully'));
});

export const getAssignments = asyncHandler(async (req: Request, res: Response) => {
  const assignments = await ContractorAssignment.find()
    .populate('contractorId', 'name')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, assignments, 'Assignments fetched successfully'));
});

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignmentData = req.body;

  // Basic validation
  if (!assignmentData.assignmentNumber || !assignmentData.contractorId || !assignmentData.lineItems || assignmentData.lineItems.length === 0) {
    throw new ApiError(400, 'Assignment Number, Contractor, and Line Items are required');
  }

  const existing = await ContractorAssignment.findOne({ assignmentNumber: assignmentData.assignmentNumber });
  if (existing) {
    throw new ApiError(400, 'Assignment Number already exists');
  }

  const newAssignment = await ContractorAssignment.create(assignmentData);

  // In a full implementation, this is where we would deduct the assigned quantities from the Store Inventory.

  res.status(201).json(
    new ApiResponse(201, newAssignment, 'Contractor Assignment Created Successfully')
  );
});
