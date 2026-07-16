import { Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import Item from './item.model';
import Metadata from '../metadata/metadata.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';

const validateDynamicData = async (data: any, metadataFields: any[], currentItemId?: string) => {
  const errors: string[] = [];
  
  for (const field of metadataFields) {
    const value = data[field.name];
    
    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label} is required.`);
      continue;
    }

    // Check unique
    if (field.unique && value) {
      const query: any = { [`dynamicData.${field.name}`]: value };
      if (currentItemId) {
        query._id = { $ne: currentItemId };
      }
      
      const existing = await Item.findOne(query);
      if (existing) {
        errors.push(`The ${field.label} '${value}' is already in use.`);
      }
    }
  }

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

  await validateDynamicData(dynamicData, metadata.fields);

  const item = await Item.create({ dynamicData });

  res.status(201).json(new ApiResponse(201, item, 'Item created successfully'));
});

export const getItems = asyncHandler(async (req: Request, res: Response) => {
  const items = await Item.find({}).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, items, 'Items fetched successfully'));
});

export const exportItems = asyncHandler(async (req: Request, res: Response) => {
  const metadata = await Metadata.findOne({ entityName: 'Item' });
  if (!metadata) {
    throw new ApiError(500, 'Item metadata configuration missing');
  }

  const items = await Item.find({}).sort({ createdAt: -1 });
  
  // Headers based on metadata labels
  const headers = metadata.fields.map((f: any) => f.label);
  
  // Build rows mapping dynamicData back to labels
  const rows = items.map(item => {
    const row: any = {};
    for (const field of metadata.fields) {
      row[field.label] = item.dynamicData?.[field.name] ?? '';
    }
    return row;
  });

  const csv = stringify(rows, { header: true, columns: headers });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="items_export.csv"');
  res.send(csv);
});

export const importItems = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No CSV file uploaded');
  }

  const metadata = await Metadata.findOne({ entityName: 'Item' });
  if (!metadata) {
    throw new ApiError(500, 'Item metadata configuration missing');
  }

  const results: any[] = [];
  let successCount = 0;
  const errors: any[] = [];

  const parser = parse(req.file.buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Create a map of Label -> Internal Field Name
  const labelToNameMap: Record<string, string> = {};
  for (const field of metadata.fields) {
    labelToNameMap[field.label.toLowerCase()] = field.name;
  }

  let rowIndex = 1;
  for await (const row of parser) {
    rowIndex++;
    try {
      const dynamicData: any = {};
      
      // Map CSV column (label) to internal name
      for (const [columnName, cellValue] of Object.entries(row)) {
        const fieldName = labelToNameMap[columnName.toLowerCase()];
        if (fieldName) {
           dynamicData[fieldName] = cellValue;
        }
      }

      // Convert number fields from string to number
      for (const field of metadata.fields) {
        if (dynamicData[field.name]) {
           if (['number', 'decimal', 'amount'].includes(field.type)) {
              dynamicData[field.name] = Number(dynamicData[field.name]);
           } else if (field.type === 'boolean') {
              const val = String(dynamicData[field.name]).toLowerCase();
              dynamicData[field.name] = val === 'yes' || val === 'true' || val === '1';
           }
        }
      }

      await validateDynamicData(dynamicData, metadata.fields);
      await Item.create({ dynamicData });
      successCount++;
    } catch (err: any) {
      errors.push({
        row: rowIndex,
        message: err.message || 'Validation failed',
        details: err.errors || []
      });
    }
  }

  res.status(200).json(new ApiResponse(200, { successCount, errors }, 'Import processed'));
});
