import { Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import Item from './item.model';
import Metadata from '../metadata/metadata.model';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { DI } from '../di/di.schema';
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

  // Note: in a real app, performedBy should come from req.user
  const performedBy = 'system'; 

  const item = await Item.create({ 
    dynamicData,
    history: [{ action: 'Created', performedBy }]
  });

  res.status(201).json(new ApiResponse(201, item, 'Item created successfully'));
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dynamicData } = req.body;

  if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(404, 'Item not found');
  }

  const metadata = await Metadata.findOne({ entityName: 'Item' });
  if (!metadata) {
    throw new ApiError(500, 'Item metadata configuration missing');
  }

  await validateDynamicData(dynamicData, metadata.fields, id);

  const item = await Item.findById(id);
  if (!item) {
    throw new ApiError(404, 'Item not found');
  }

  const performedBy = (req as any).user?._id || 'system';

  item.dynamicData = { ...item.dynamicData, ...dynamicData };
  item.history.push({ action: 'Updated', performedBy, date: new Date() });
  item.markModified('dynamicData');
  await item.save();

  res.status(200).json(new ApiResponse(200, item, 'Item updated successfully'));
});

export const getItems = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const sortBy = req.query.sortBy as string;
  const sortOrder = (req.query.sortOrder as string) === 'desc' ? -1 : 1;
  const isDeleted = req.query.isDeleted === 'true';

  let sortObject: any = { createdAt: -1 };
  if (sortBy) {
    sortObject = { [`dynamicData.${sortBy}`]: sortOrder };
  }

  const skip = (page - 1) * limit;

  let queryCondition: any = isDeleted ? { isDeleted: true } : { isDeleted: { $ne: true } };
  
  let hasFilterSort = false;
  const exprFilters: any[] = [];

  // Apply column filters
  for (const [key, value] of Object.entries(req.query)) {
    if (key.startsWith('filter_') && value) {
      const fieldName = key.replace('filter_', '');
      
      exprFilters.push({
        $regexMatch: {
          input: { $toString: `$dynamicData.${fieldName}` },
          regex: String(value),
          options: "i"
        }
      });

      // Implicitly sort by the filtered field alphabetically (shorter/exact matches first) if no explicit sort is provided
      if (!sortBy && !hasFilterSort) {
        sortObject = { [`dynamicData.${fieldName}`]: 1 };
        hasFilterSort = true;
      }
    }
  }

  if (exprFilters.length > 0) {
    if (exprFilters.length === 1) {
      queryCondition.$expr = exprFilters[0];
    } else {
      queryCondition.$expr = { $and: exprFilters };
    }
  }

  let query = Item.find(queryCondition);
  const filter = query.getFilter();
  const totalItems = await Item.countDocuments(filter);
  const items = await query
    .sort(sortObject)
    .collation({ locale: 'en', numericOrdering: true })
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

export const getItemById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Validate ObjectId to prevent 500 CastErrors
  if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(404, 'Item not found');
  }

  const item = await Item.findById(id);
  if (!item) {
    throw new ApiError(404, 'Item not found');
  }
  res.status(200).json(new ApiResponse(200, item, 'Item fetched successfully'));
});

export const getItemUsage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(404, 'Item not found');
  }

  const objectId = new mongoose.Types.ObjectId(id);

  // Find Purchase Orders containing this item
  const purchaseOrders = await PurchaseOrder.find({ 'lineItems.itemId': objectId })
    .select('_id purchaseOrderNumber date vendorName status')
    .sort({ date: -1 });

  // Find DI Registrations containing this item
  const dis = await DI.find({ 'lineItems.itemId': objectId })
    .select('_id diNumber date status')
    .sort({ date: -1 });

  res.status(200).json(new ApiResponse(200, {
    purchaseOrders,
    dis
  }, 'Item usage fetched successfully'));
});

export const bulkDeleteItems = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Please provide an array of item IDs to delete');
  }

  const performedBy = 'system';
  const result = await Item.updateMany(
    { _id: { $in: ids } },
    { 
      $set: { isDeleted: true },
      $push: { history: { action: 'Deleted', performedBy } }
    }
  );
  
  res.status(200).json(new ApiResponse(200, { deletedCount: result.modifiedCount }, 'Items deleted successfully'));
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
    'itemdescription': 'description',
    'loaserialno': 'sku',
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

      // Check required constraints synchronously
      for (const field of metadata.fields) {
         if (field.required) {
            const value = dynamicData[field.name];
            if (value === undefined || value === null || value === '') {
               rowErrors.push(`${field.label} is required.`);
            }
         }
      }
      
      // If validation passed, push to valid items array
      const performedBy = 'system';
      validItems.push({ 
        dynamicData,
        history: [{ action: 'Imported', performedBy }]
      });

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

  // Batch Uniqueness Check against Database
  if (uniqueFields.length > 0 && validItems.length > 0) {
    const orConditions = [];
    for (const uField of uniqueFields) {
      const values = validItems.map(item => item.dynamicData[uField]).filter(Boolean);
      if (values.length > 0) {
        orConditions.push({ [`dynamicData.${uField}`]: { $in: values } });
      }
    }
    
    if (orConditions.length > 0) {
      const existingDuplicates = await Item.find({ $or: orConditions }).select('dynamicData').lean();
      
      if (existingDuplicates.length > 0) {
        const duplicateDetails = new Set<string>();
        for (const existing of existingDuplicates) {
          for (const uField of uniqueFields) {
            const val = (existing as any).dynamicData?.[uField];
            if (val && validItems.some(item => item.dynamicData[uField] === val)) {
              duplicateDetails.add(`The value '${val}' for field '${uField}' already exists in the database.`);
            }
          }
        }
        
        if (duplicateDetails.size > 0) {
          return res.status(400).json(new ApiResponse(400, { 
            errors: [{ 
              row: 'Database Check', 
              message: 'Uniqueness validation failed', 
              details: Array.from(duplicateDetails) 
            }] 
          }, 'Import failed due to database uniqueness constraints.'));
        }
      }
    }
  }

  // Atomic bulk insert
  await Item.insertMany(validItems);

  res.status(200).json(new ApiResponse(200, { successCount: validItems.length }, 'Import processed successfully'));
});
