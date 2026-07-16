import { Request, Response } from 'express';
import Metadata from './metadata.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';

export const getMetadataByEntity = asyncHandler(async (req: Request, res: Response) => {
  const { entityName } = req.params;
  const metadata = await Metadata.findOne({ entityName });
  
  if (!metadata) {
    throw new ApiError(404, `Metadata for entity ${entityName} not found`);
  }
  
  res.status(200).json(new ApiResponse(200, metadata, 'Metadata fetched successfully'));
});

// Admin-only route to update configuration
export const updateMetadata = asyncHandler(async (req: Request, res: Response) => {
  const { entityName } = req.params;
  const { fields } = req.body;

  const metadata = await Metadata.findOneAndUpdate(
    { entityName },
    { fields },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json(new ApiResponse(200, metadata, 'Metadata updated successfully'));
});
