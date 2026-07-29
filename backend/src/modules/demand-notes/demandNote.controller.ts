import { Request, Response } from 'express';
import DemandNote from './demandNote.schema';
import Item from '../items/item.schema';
import StoreInwardEntry from '../store/store.schema'; // To get stock bal or issued qty if needed
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';

// Utility to generate next demand note number
const generateNextDemandNoteNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `DN-${year}${month}-`;
  
  const lastNote = await DemandNote.findOne({ demandNoteNumber: new RegExp(`^${prefix}`) })
    .sort({ demandNoteNumber: -1 })
    .limit(1);

  let sequence = 1;
  if (lastNote && lastNote.demandNoteNumber) {
    const lastSequence = parseInt(lastNote.demandNoteNumber.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

export const createDemandNote = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  if (!user.assignedPackage || !user.assignedCircle) {
    throw new ApiError(400, 'User is not assigned to a specific Package and Circle.');
  }

  const demandNoteNumber = await generateNextDemandNoteNumber();
  const payload = {
    ...req.body,
    demandNoteNumber,
    createdBy: user._id,
    package: user.assignedPackage,
    circle: user.assignedCircle
  };

  const demandNote = await DemandNote.create(payload);
  res.status(201).json(new ApiResponse(201, { demandNote }, 'Demand Note created successfully'));
});

// Endpoint to fetch real-time constraints for a specific item in the context of the user's package and circle
export const getContextData = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  const { itemId } = req.query;

  if (!user.assignedPackage || !user.assignedCircle) {
    throw new ApiError(400, 'User is not assigned to a specific Package and Circle.');
  }
  if (!itemId) {
    throw new ApiError(400, 'Item ID is required.');
  }

  // Fetch the item
  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(404, 'Item not found');
  }

  // Calculate "Already Issued Qty" from past approved demand notes for this package and circle
  const pastDemandNotes = await DemandNote.find({
    package: user.assignedPackage,
    circle: user.assignedCircle,
    status: { $in: ['Approved', 'Fulfilled'] }
  });

  let alreadyIssuedQty = 0;
  for (const dn of pastDemandNotes) {
    for (const dnItem of dn.items) {
      if (dnItem.itemId?.toString() === itemId.toString()) {
        alreadyIssuedQty += dnItem.demandQty || 0;
      }
    }
  }

  // Example: Transfer from / Transfer to could be derived here by querying MINs or other Store Outward logs.
  // For now, keeping placeholders as discussed with user.
  let transferFromOther = 0;
  let transferToOther = 0;

  res.status(200).json(new ApiResponse(200, {
    itemDescription: item.description,
    bomQty: item.bomQty || 0, // Fallback, normally BOM might be item-specific or project-specific
    stockBal: item.stockBalance || 0, // Assuming central stock balance
    alreadyIssuedQty,
    transferFromOther,
    transferToOther
  }, 'Context data fetched'));
});

export const getDemandNotes = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  const filter: any = {};

  // If user is not an admin, restrict to their package and circle
  if (user.role?.name === 'Site Manager') {
    filter.package = user.assignedPackage;
    filter.circle = user.assignedCircle;
  }

  const demandNotes = await DemandNote.find(filter)
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
    
  res.status(200).json(new ApiResponse(200, { demandNotes }, 'Demand Notes fetched'));
});

export const getDemandNoteById = asyncHandler(async (req: Request, res: Response) => {
  const demandNote = await DemandNote.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email');
    
  if (!demandNote) {
    throw new ApiError(404, 'Demand Note not found');
  }
  res.status(200).json(new ApiResponse(200, { demandNote }, 'Demand Note fetched'));
});

export const updateDemandNote = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user as any;
  
  // Site managers can only edit if Draft or Pending Approval
  const existing = await DemandNote.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Demand Note not found');
  
  if (user.role?.name === 'Site Manager' && !['Draft', 'Pending Approval'].includes(existing.status)) {
    throw new ApiError(403, 'Cannot edit an approved or fulfilled demand note.');
  }

  // Prevent changing package/circle by dropping from payload
  const updateData = { ...req.body };
  delete updateData.package;
  delete updateData.circle;
  delete updateData.demandNoteNumber;
  delete updateData.createdBy;

  const demandNote = await DemandNote.findByIdAndUpdate(req.params.id, updateData, { new: true });
  res.status(200).json(new ApiResponse(200, { demandNote }, 'Demand Note updated successfully'));
});

export const deleteDemandNote = asyncHandler(async (req: Request, res: Response) => {
  const existing = await DemandNote.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Demand Note not found');

  if (existing.status !== 'Draft' && existing.status !== 'Pending Approval') {
    throw new ApiError(403, 'Only Draft or Pending Demand Notes can be deleted.');
  }

  await existing.deleteOne();
  res.status(200).json(new ApiResponse(200, {}, 'Demand Note deleted successfully'));
});
