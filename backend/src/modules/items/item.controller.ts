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
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const sortBy = req.query.sortBy as string;
  const sortOrder = (req.query.sortOrder as string) === 'desc' ? -1 : 1;

  let sortObject: any = { createdAt: -1 };
  if (sortBy) {
    sortObject = { [`dynamicData.${sortBy}`]: sortOrder };
  }

  const skip = (page - 1) * limit;

  const totalItems = await Item.countDocuments();
  const items = await Item.find({})
    .sort(sortObject)
    .collation({ locale: 'en', numericOrdering: true }) // helps sort numbers/strings nicely
    .skip(skip)
    .limit(limit);

  res.status(200).json(new ApiResponse(200, {
    items,
    pagination: {
      totalItems,
      currentPage: page,
      limit,
      totalPages: Math.ceil(totalItems / limit)
    }
  }, 'Items fetched successfully'));
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
  const errors: any[] = [];
  const validItems: any[] = [];

  const parser = parse(req.file.buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Create a map of Label -> Internal Field Name with normalized keys
  const labelToNameMap: Record<string, string> = {};
  const uniqueFields: string[] = [];
  
  for (const field of metadata.fields) {
    const normalized = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    labelToNameMap[normalized] = field.name;
    labelToNameMap[field.label.toLowerCase()] = field.name;
    
    if (field.unique) {
      uniqueFields.push(field.name);
    }
  }

  // Common aliases for import
  const aliases: Record<string, string> = {
    'itemname': 'name',
    'itemdesc': 'description',
    'loaserialno': 'loaserialno',
  };

  let rowIndex = 1;
  const seenUniqueValues: Record<string, Set<any>> = {};
  uniqueFields.forEach(f => seenUniqueValues[f] = new Set());

  for await (const row of parser) {
    rowIndex++;
    try {
      const dynamicData: any = {};
      
      for (const [columnName, cellValue] of Object.entries(row)) {
        const normalizedCol = columnName.toLowerCase().replace(/[^a-z0-9]/g, '');
        let fieldName = labelToNameMap[normalizedCol] || labelToNameMap[columnName.toLowerCase()];
        
        if (!fieldName && aliases[normalizedCol]) {
          fieldName = aliases[normalizedCol];
        }

        if (fieldName) {
           dynamicData[fieldName] = cellValue;
        } else {
           dynamicData[columnName] = cellValue;
           dynamicData[normalizedCol] = cellValue;
        }
      }

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

      if (!dynamicData.type) dynamicData.type = 'Goods';
      if (!dynamicData.costPrice && dynamicData.costPrice !== 0) dynamicData.costPrice = 0;
      if (!dynamicData.sellingPrice && dynamicData.sellingPrice !== 0) dynamicData.sellingPrice = 0;
      if (!dynamicData.unit) dynamicData.unit = 'pcs';

      // Check uniqueness within the CSV file itself
      const rowErrors: string[] = [];
      for (const uField of uniqueFields) {
        const val = dynamicData[uField];
        if (val) {
          if (seenUniqueValues[uField].has(val)) {
            rowErrors.push(`Duplicate value '${val}' found within the CSV for field '${uField}'.`);
          } else {
            seenUniqueValues[uField].add(val);
          }
        }
      }

      if (rowErrors.length > 0) {
        throw new ApiError(400, 'Validation failed', rowErrors);
      }

      // Check database uniqueness and required constraints
      await validateDynamicData(dynamicData, metadata.fields);
      
      // If validation passed, push to valid items array
      validItems.push({ dynamicData });

    } catch (err: any) {
      errors.push({
        row: rowIndex,
        message: err.message || 'Validation failed',
        details: err.errors || []
      });
    }
  }

  if (errors.length > 0) {
    // If ANY row has an error, abort the entire import
    return res.status(400).json(new ApiResponse(400, { errors }, 'Import failed due to validation errors. No items were imported.'));
  }

  // Atomic bulk insert
  await Item.insertMany(validItems);

  res.status(200).json(new ApiResponse(200, { successCount: validItems.length }, 'Import processed successfully'));
});
