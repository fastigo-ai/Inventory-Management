import { Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import Item from './item.model';
import Metadata from '../metadata/metadata.model';
import { SummaryService } from '../reports/summary/summary.service';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { DI } from '../di/di.schema';
import { PurchaseInvoice } from '../purchases/purchaseInvoice.schema';
import { Pr } from '../purchases/pr.schema';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
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

  SummaryService.rebuildForItem(item._id.toString()).catch(console.error);

  res.status(201).json(new ApiResponse(201, item, 'Item created successfully'));
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dynamicData } = req.body;

  if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(404, 'Item not found');
  }

  const item = await Item.findById(id);
  if (!item) {
    throw new ApiError(404, 'Item not found');
  }

  // 1. Check if item is in circulation
  const objectId = new mongoose.Types.ObjectId(id);
  const inUse = await PurchaseOrder.exists({ 'lineItems.itemId': objectId }) || 
                await DI.exists({ 'lineItems.itemId': objectId });

  if (inUse) {
    const criticalFields = ['unit', 'tempCode', 'temp_code', 'sku'];
    for (const field of criticalFields) {
      if (dynamicData[field] !== undefined && dynamicData[field] !== item.dynamicData[field]) {
        throw new ApiError(400, `Cannot update critical field '${field}' because this item is already in circulation (used in POs or DIs).`);
      }
    }
  }

  const metadata = await Metadata.findOne({ entityName: 'Item' });
  if (!metadata) {
    throw new ApiError(500, 'Item metadata configuration missing');
  }

  await validateDynamicData(dynamicData, metadata.fields, id);

  const performedBy = (req as any).user?._id || 'system';

  item.dynamicData = { ...item.dynamicData, ...dynamicData };
  item.history.push({ action: 'Updated', performedBy, date: new Date() });
  item.markModified('dynamicData');
  await item.save();

  SummaryService.rebuildForItem(item._id.toString()).catch(console.error);

  res.status(200).json(new ApiResponse(200, item, 'Item updated successfully'));
});

export const getItems = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const sortBy = req.query.sortBy as string;
  const sortOrder = (req.query.sortOrder as string) === 'desc' ? -1 : 1;
  const isDeleted = req.query.isDeleted === 'true';
  const search = req.query.search as string;

  let sortObject: any = { createdAt: -1 };
  if (sortBy) {
    sortObject = { [`dynamicData.${sortBy}`]: sortOrder };
  }

  const skip = (page - 1) * limit;

  let queryCondition: any = isDeleted ? { isDeleted: true } : { isDeleted: { $ne: true } };
  
  let hasFilterSort = false;
  const exprFilters: any[] = [];

  if (search) {
    exprFilters.push({
      $gt: [
        {
          $size: {
            $filter: {
              input: { $objectToArray: "$dynamicData" },
              as: "field",
              cond: {
                $regexMatch: {
                  input: { $toString: "$$field.v" },
                  regex: search,
                  options: "i"
                }
              }
            }
          }
        },
        0
      ]
    });
  }

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

  // 1. Purchase Orders
  const poDocs = await PurchaseOrder.find({ 'lineItems.itemId': objectId })
    .select('_id purchaseOrderNumber date vendorName status lineItems')
    .sort({ date: -1 })
    .lean();
    
  const purchaseOrders = poDocs.map(po => {
    const matchingLines = po.lineItems.filter((li: any) => li.itemId && li.itemId.toString() === objectId.toString());
    const totalQty = matchingLines.reduce((sum: number, li: any) => sum + (li.quantity || 0), 0);
    const rate = matchingLines.length > 0 ? matchingLines[0].rate : 0;
    
    return {
      _id: po._id,
      purchaseOrderNumber: po.purchaseOrderNumber,
      date: po.date,
      vendorName: po.vendorName,
      status: po.status,
      quantity: totalQty,
      rate
    };
  });

  // 2. DI Registrations
  const diDocs = await DI.find({ 'lineItems.itemId': objectId })
    .select('_id diNumber date status vendorName lineItems')
    .sort({ date: -1 })
    .lean();

  const dis = diDocs.map(di => {
    const matchingLines = di.lineItems.filter((li: any) => li.itemId && li.itemId.toString() === objectId.toString());
    const totalQty = matchingLines.reduce((sum: number, li: any) => sum + (li.quantity || 0), 0);
    return {
      _id: di._id,
      diNumber: di.diNumber,
      date: di.date,
      vendorName: di.vendorName,
      status: di.status,
      quantity: totalQty
    };
  });

  // 3. Purchase Invoices
  const piDocs = await PurchaseInvoice.find({ 'lineItems.itemId': objectId })
    .select('_id invoiceNumber date vendorName status lineItems')
    .sort({ date: -1 })
    .lean();
    
  const purchaseInvoices = piDocs.map(pi => {
    const matchingLines = pi.lineItems.filter((li: any) => li.itemId && li.itemId.toString() === objectId.toString());
    const totalQty = matchingLines.reduce((sum: number, li: any) => sum + (li.quantity || 0), 0);
    const rate = matchingLines.length > 0 ? matchingLines[0].rate : 0;
    return {
      _id: pi._id,
      invoiceNumber: pi.invoiceNumber,
      date: pi.date,
      vendorName: pi.vendorName,
      status: pi.status,
      quantity: totalQty,
      rate
    };
  });

  // 4. Purchase Receives (Store Inwards)
  const prDocs = await Pr.find({ 'lineItems.itemId': objectId })
    .select('_id purchaseReceiveNumber receiveDate vendorName status lineItems')
    .sort({ receiveDate: -1 })
    .lean();
    
  const purchaseReceives = prDocs.map(pr => {
    const matchingLines = pr.lineItems.filter((li: any) => li.itemId && li.itemId.toString() === objectId.toString());
    const invoiceQty = matchingLines.reduce((sum: number, li: any) => sum + (li.invoiceQuantity || 0), 0);
    const actQty = matchingLines.reduce((sum: number, li: any) => sum + (li.act || 0), 0);
    return {
      _id: pr._id,
      purchaseReceiveNumber: pr.purchaseReceiveNumber,
      date: pr.receiveDate,
      vendorName: pr.vendorName,
      status: pr.status,
      invoiceQuantity: invoiceQty,
      acceptedQuantity: actQty
    };
  });

  // 5. Contractor Assignments (Issues)
  const assignmentDocs = await ContractorAssignment.find({ 'lineItems.itemId': objectId })
    .populate('contractorId', 'name companyName')
    .select('_id assignmentNumber minNo date status lineItems contractorId')
    .sort({ date: -1 })
    .lean();
    
  const contractorAssignments = assignmentDocs.map((ca: any) => {
    const matchingLines = ca.lineItems.filter((li: any) => li.itemId && li.itemId.toString() === objectId.toString());
    const totalQty = matchingLines.reduce((sum: number, li: any) => sum + (li.quantity || 0), 0);
    const contractorName = ca.contractorId ? (ca.contractorId.companyName || ca.contractorId.name) : 'Unknown Contractor';
    return {
      _id: ca._id,
      assignmentNumber: ca.minNo || ca.assignmentNumber,
      date: ca.date,
      contractorName,
      status: ca.status,
      quantity: totalQty
    };
  });

  res.status(200).json(new ApiResponse(200, {
    purchaseOrders,
    dis,
    purchaseInvoices,
    purchaseReceives,
    contractorAssignments
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
  
  for (const id of ids) {
    SummaryService.rebuildForItem(id.toString()).catch(console.error);
  }

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

  const errors: any[] = [];
  const validItems: any[] = [];

  const parser = parseAndSanitizeCsv(req.file.buffer);

  // Create a map of Label -> Internal Field Name with normalized keys
  const labelToNameMap: Record<string, string> = {};
  const uniqueFields: string[] = ['sku', 'tempCode', 'name']; // Enforce SKU, TEMP CODE, or Name as unique identifiers for imports
  
  for (const field of metadata.fields) {
    const normalized = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    labelToNameMap[normalized] = field.name;
    labelToNameMap[field.label.toLowerCase()] = field.name;
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

  // Batch Upsert Logic (Update if exists by unique field, else Insert)
  const bulkOps: any[] = [];
  
  if (uniqueFields.length > 0 && validItems.length > 0) {
    const orConditions = [];
    for (const uField of uniqueFields) {
      const values = validItems.map(item => item.dynamicData[uField]).filter(Boolean);
      if (values.length > 0) {
        orConditions.push({ [`dynamicData.${uField}`]: { $in: values } });
      }
    }
    
    const existingItemsMap = new Map();
    if (orConditions.length > 0) {
      const existingItems = await Item.find({ $or: orConditions }).lean();
      for (const existing of existingItems) {
        for (const uField of uniqueFields) {
          const val = (existing as any).dynamicData?.[uField];
          if (val) {
            existingItemsMap.set(`${uField}:${val}`, existing);
          }
        }
      }
    }

    for (const item of validItems) {
      let matchedExisting: any = null;
      // Prefer matching by SKU (LOA Serial No) first
      if (item.dynamicData.sku && existingItemsMap.has(`sku:${item.dynamicData.sku}`)) {
         matchedExisting = existingItemsMap.get(`sku:${item.dynamicData.sku}`);
      } else if (item.dynamicData.tempCode && existingItemsMap.has(`tempCode:${item.dynamicData.tempCode}`)) {
         matchedExisting = existingItemsMap.get(`tempCode:${item.dynamicData.tempCode}`);
      } else if (item.dynamicData.name && existingItemsMap.has(`name:${item.dynamicData.name}`)) {
         matchedExisting = existingItemsMap.get(`name:${item.dynamicData.name}`);
      } else {
         for (const uField of uniqueFields) {
           const val = item.dynamicData[uField];
           if (val && existingItemsMap.has(`${uField}:${val}`)) {
             matchedExisting = existingItemsMap.get(`${uField}:${val}`);
             break;
           }
         }
      }

      if (matchedExisting) {
         bulkOps.push({
            updateOne: {
               filter: { _id: matchedExisting._id },
               update: {
                  $set: {
                     dynamicData: { ...matchedExisting.dynamicData, ...item.dynamicData }
                  },
                  $push: {
                     history: { action: 'Updated via Import', performedBy: 'system', date: new Date() }
                  }
               }
            }
         });
      } else {
         bulkOps.push({
            insertOne: {
               document: item
            }
         });
      }
    }
  } else {
    // No unique fields, just insert all
    for (const item of validItems) {
      bulkOps.push({ insertOne: { document: item } });
    }
  }

  if (bulkOps.length > 0) {
    await Item.bulkWrite(bulkOps);

    // After bulk write, rebuild summary for all affected items by their SKUs
    if (uniqueFields.length > 0 && validItems.length > 0) {
      const skus = validItems.map(item => item.dynamicData.sku).filter(Boolean);
      if (skus.length > 0) {
        const affectedItems = await Item.find({ 'dynamicData.sku': { $in: skus } }).select('_id').lean();
        for (const affected of affectedItems) {
          SummaryService.rebuildForItem(affected._id.toString()).catch(console.error);
        }
      }
    } else {
      // If no unique fields, it's harder to track. We could fetch recently created items.
      // But typically SKU is unique. We'll skip for now if no unique fields.
    }
  }

  res.status(200).json(new ApiResponse(200, { successCount: validItems.length }, 'Import processed successfully (updated or added items).'));
});
