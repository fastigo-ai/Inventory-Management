import { Request, Response } from 'express';
import Item from './item.model';
import Metadata from '../metadata/metadata.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';

const validateDynamicData = (data: any, metadataFields: any[]) => {
  const errors: string[] = [];
  
  metadataFields.forEach(field => {
    const value = data[field.name];
    
    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label} is required.`);
    }

    // In a full implementation, add type checking (number vs string) and regex validation here
  });

  if (errors.length > 0) {
    throw new ApiError(400, 'Validation failed', errors);
  }
};

export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const { dynamicData } = req.body;

  const metadata = await Metadata.findOne({ entityName: 'Item' });
  if (!metadata) {
    throw new ApiError(500, 'Item metadata configuration missing');
  }

  validateDynamicData(dynamicData, metadata.fields);

  const item = await Item.create({ dynamicData });

  res.status(201).json(new ApiResponse(201, item, 'Item created successfully'));
});

export const getItems = asyncHandler(async (req: Request, res: Response) => {
  const items = await Item.find({}).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, items, 'Items fetched successfully'));
});
