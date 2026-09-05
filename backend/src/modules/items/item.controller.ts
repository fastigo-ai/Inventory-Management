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

const parseNum = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const num = Number(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
};

const calculateLoaQuantity = (dynamicData: any) => {
  const solan = parseNum(dynamicData.solanLoaQuantity);
  const nahan = parseNum(dynamicData.nahanLoaQuantity);
  const rampur = parseNum(dynamicData.rampurLoaQuantity);
  const rohru = parseNum(dynamicData.rohruLoaQuantity);

  const pkg1Sum = solan + nahan;
  const pkg2Sum = rampur + rohru;

  if (pkg1Sum > 0) return pkg1Sum;
  if (pkg2Sum > 0) return pkg2Sum;
  return parseNum(dynamicData.loaQuantity);
};

export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const { dynamicData } = req.body;

  const metadata = await Metadata.findOne({ entityName: 'Item' });
  if (!metadata) {
    throw new ApiError(500, 'Item metadata configuration missing');
  }

  dynamicData.loaQuantity = calculateLoaQuantity(dynamicData);

  await validateDynamicData(dynamicData, metadata.fields);

  // performedBy comes from req.user
  const performedBy = (req as any).user?._id || 'system'; 

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
  item.dynamicData.loaQuantity = calculateLoaQuantity(item.dynamicData);
  
  item.history.push({ action: 'Updated', performedBy, date: new Date() });
  item.markModified('dynamicData');
  await item.save();

  SummaryService.rebuildForItem(item._id.toString()).catch(console.error);

  res.status(200).json(new ApiResponse(200, item, 'Item updated successfully'));
});

const buildItemQueryAndSort = (queryParams: any) => {
  const sortBy = queryParams.sortBy as string;
  const sortOrder = (queryParams.sortOrder as string) === 'desc' ? -1 : 1;
  const isDeleted = queryParams.isDeleted === 'true';
  const search = queryParams.search as string;

  let sortObject: any = { createdAt: 1 };
  if (sortBy) {
    sortObject = { [`dynamicData.${sortBy}`]: sortOrder };
  }

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
                $or: [
                  {
                    $and: [
                      { $eq: ["$$field.k", "tempCode"] },
                      { $eq: [{ $convert: { input: "$$field.v", to: "string", onError: "", onNull: "" } }, search] }
                    ]
                  },
                  {
                    $and: [
                      { $ne: ["$$field.k", "tempCode"] },
                      {
                        $regexMatch: {
                          input: { $convert: { input: "$$field.v", to: "string", onError: "", onNull: "" } },
                          regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                          options: "i"
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        },
        0
      ]
    });
  }

  // Apply column filters
  for (const [key, value] of Object.entries(queryParams)) {
    if (key.startsWith('filter_') && value) {
      const fieldName = key.replace('filter_', '');
      
      const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      const exactMatchFields = ['sku', 'tempCode', 'activity', 'loaSrNo', 'loaSerialNo'];
      const isExact = exactMatchFields.includes(fieldName);
      
      let regexStr = escapedValue;
      if (fieldName === 'package' || fieldName === 'circle') {
        const normalizedVal = String(value).replace(/\s+/g, '');
        regexStr = normalizedVal.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      }
      
      exprFilters.push({
        $regexMatch: {
          input: { $toString: `$dynamicData.${fieldName}` },
          regex: isExact ? `^${regexStr}$` : regexStr,
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

  return { queryCondition, sortObject };
};

export const getItems = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const { queryCondition, sortObject } = buildItemQueryAndSort(req.query);

  let query = Item.find(queryCondition);
  const filter = query.getFilter();
  const totalItems = await Item.countDocuments(filter);
  const items = await query
    .sort(sortObject)
    .collation({ locale: 'en', numericOrdering: true })
    .skip(skip)
    .limit(limit)
    .lean();

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
  const item = await Item.findById(objectId);
  
  if (!item) {
    throw new ApiError(404, 'Item not found');
  }

  const loaSerialNos = [
    item.dynamicData?.loaSerialNo,
    item.dynamicData?.loaSerialNumber,
    item.dynamicData?.sku
  ].filter(Boolean);
  
  const tempCode = item.dynamicData?.tempCode;

  const orConditions: any[] = [
    { 'lineItems.itemId': objectId }
  ];

  if (loaSerialNos.length > 0) {
    orConditions.push({ 'lineItems.loaSerialNo': { $in: loaSerialNos } });
  }
  if (tempCode) {
    orConditions.push({ 'lineItems.tempCode': tempCode });
  }

  const isMatchingLine = (li: any) => {
    if (li.itemId && li.itemId.toString() === objectId.toString()) return true;
    if (li.loaSerialNo && loaSerialNos.includes(li.loaSerialNo)) return true;
    if (li.tempCode && li.tempCode === tempCode) return true;
    return false;
  };

  // 1. Purchase Orders
  const poDocs = await PurchaseOrder.find({ $or: orConditions })
    .select('_id purchaseOrderNumber date vendorName status lineItems')
    .sort({ date: 1 })
    .lean();
    
  const purchaseOrders = poDocs.map(po => {
    const matchingLines = po.lineItems.filter(isMatchingLine);
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
  const diDocs = await DI.find({ $or: orConditions })
    .select('_id diNumber date status vendorName lineItems')
    .sort({ date: 1 })
    .lean();

  const dis = diDocs.map(di => {
    const matchingLines = di.lineItems.filter(isMatchingLine);
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
  const piDocs = await PurchaseInvoice.find({ $or: orConditions })
    .select('_id invoiceNumber date vendorName status lineItems')
    .sort({ date: 1 })
    .lean();
    
  const purchaseInvoices = piDocs.map(pi => {
    const matchingLines = pi.lineItems.filter(isMatchingLine);
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
  const prDocs = await Pr.find({ $or: orConditions })
    .select('_id purchaseReceiveNumber receiveDate vendorName status lineItems')
    .sort({ receiveDate: 1 })
    .lean();
    
  const purchaseReceives = prDocs.map(pr => {
    const matchingLines = pr.lineItems.filter(isMatchingLine);
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
  const assignmentDocs = await ContractorAssignment.find({ $or: orConditions })
    .populate('contractorId', 'name companyName')
    .select('_id assignmentNumber minNo date status lineItems contractorId')
    .sort({ date: 1 })
    .lean();
    
  const contractorAssignments = assignmentDocs.map((ca: any) => {
    const matchingLines = ca.lineItems.filter(isMatchingLine);
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

  const performedBy = (req as any).user?._id || 'system';
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

  const { queryCondition, sortObject } = buildItemQueryAndSort(req.query);

  const items = await Item.find(queryCondition)
    .sort(sortObject)
    .collation({ locale: 'en', numericOrdering: true })
    .lean();
  
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
    'tempcod': 'tempCode',
    'totalloarampur': 'rampurLoaQuantity',
    'totalbomrampur': 'rampurBomQuantity',
    'totalloanahan': 'nahanLoaQuantity',
    'totalbomnahan': 'nahanBomQuantity',
    'totalloasolan': 'solanLoaQuantity',
    'totalbomsolan': 'solanBomQuantity',
    'totalloarohru': 'rohruLoaQuantity',
    'totalbomrohru': 'rohruBomQuantity',
    'solanloa': 'solanLoaQuantity',
    'solanbom': 'solanBomQuantity',
    'nahanloa': 'nahanLoaQuantity',
    'nahanbom': 'nahanBomQuantity',
    'nahanboi': 'nahanBomQuantity',
    'rampurloa': 'rampurLoaQuantity',
    'rampurlo': 'rampurLoaQuantity',
    'rampurbom': 'rampurBomQuantity',
    'rampurbo': 'rampurBomQuantity',
    'rohruloa': 'rohruLoaQuantity',
    'rohrubom': 'rohruBomQuantity',
    'rohrubomqty': 'rohruBomQuantity',
    'loaerectionratewithgst': 'erectionRateWithGst',
    'loasupplyratewithgst': 'supplyRateWithGst',
    'erectionratewithgst': 'erectionRateWithGst',
    'supplyratewithgst': 'supplyRateWithGst',
  };

  let rowIndex = 1;
  const seenUniqueValues = new Set<string>();

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

      // If the row is completely empty (no SKU, no Temp Code, no Name), skip it entirely
      const hasSku = !!(dynamicData.sku || dynamicData['loaserialno']);
      const hasTempCode = !!(dynamicData.tempCode || dynamicData['tempcode']);
      const hasName = !!(dynamicData.name || dynamicData['itemname']);
      
      if (!hasSku && !hasTempCode && !hasName) {
         continue;
      }

      for (const field of metadata.fields) {
        if (dynamicData[field.name]) {
           if (['number', 'decimal', 'amount'].includes(field.type)) {
              dynamicData[field.name] = parseNum(dynamicData[field.name]);
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

      dynamicData.loaQuantity = calculateLoaQuantity(dynamicData);

      const rowErrors: string[] = [];
      
      let packageVal = String(dynamicData['package'] || '').trim();
      if (/^Package\s*1/i.test(packageVal)) {
         packageVal = 'Package 1(S/N)';
      } else if (/^Package\s*2/i.test(packageVal)) {
         packageVal = 'Package 2(R/R)';
      }
      dynamicData['package'] = packageVal;
      
      const circleVal = String(dynamicData['circle'] || '').trim();
      dynamicData['circle'] = circleVal;
      
      const skuVal = dynamicData['sku'] || '';
      
      // Check uniqueness within the CSV file itself using Composite Key
      if (skuVal) {
        const compositeKey = `${packageVal}|${circleVal}|${skuVal}`;
        if (seenUniqueValues.has(compositeKey)) {
          rowErrors.push(`Duplicate item combination found within the CSV for Package: '${packageVal}', Circle: '${circleVal}', SKU: '${skuVal}'.`);
        } else {
          seenUniqueValues.add(compositeKey);
        }
      }

      // Package and Circle Validation
      if (packageVal === 'Package 1(S/N)' && !['Solan', 'Nahan'].includes(circleVal)) {
        rowErrors.push(`Invalid Circle '${circleVal}' for Package 1(S/N). Must be Solan or Nahan.`);
      } else if (packageVal === 'Package 2(R/R)' && !['Rampur', 'Rohru'].includes(circleVal)) {
        rowErrors.push(`Invalid Circle '${circleVal}' for Package 2(R/R). Must be Rampur or Rohru.`);
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
      
      if (rowErrors.length > 0) {
        throw new ApiError(400, 'Validation failed', rowErrors);
      }
      
      // If validation passed, push to valid items array
      const performedBy = (req as any).user?._id || 'system';
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

  // Batch Upsert Logic (Update if exists by unique composite key, else Insert)
  const bulkOps: any[] = [];
  
  // Chunk helper
  const chunkArray = (arr: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  if (validItems.length > 0) {
    try {
      const itemChunks = chunkArray(validItems, 1000);
    
    for (const chunk of itemChunks) {
      const orConditions = chunk.flatMap((item: any) => {
        const conds: any[] = [];
        const base = {
          'dynamicData.package': item.dynamicData.package,
          'dynamicData.circle': item.dynamicData.circle
        };
        
        if (item.dynamicData.sku) {
          conds.push({ ...base, 'dynamicData.sku': item.dynamicData.sku });
        } else if (item.dynamicData.tempCode && item.dynamicData.tempCode !== '0') {
          conds.push({ ...base, 'dynamicData.tempCode': item.dynamicData.tempCode });
        } else if (item.dynamicData.name) {
          conds.push({ ...base, 'dynamicData.name': item.dynamicData.name });
        }
        
        return conds;
      });
      
      let existingItems: any[] = [];
      if (orConditions.length > 0) {
        existingItems = await Item.find({ $or: orConditions }).lean();
      }

      // Convert DB items to a Map for O(1) lookup
      const dbItemsMap = new Map();
      for (const ext of existingItems) {
        const pkg = ext.dynamicData?.package || '';
        const circle = ext.dynamicData?.circle || '';
        if (ext.dynamicData?.sku) {
          dbItemsMap.set(`${pkg}|${circle}|sku|${ext.dynamicData.sku}`, ext);
        } else if (ext.dynamicData?.tempCode && ext.dynamicData.tempCode !== '0') {
          dbItemsMap.set(`${pkg}|${circle}|tempCode|${ext.dynamicData.tempCode}`, ext);
        } else if (ext.dynamicData?.name) {
          dbItemsMap.set(`${pkg}|${circle}|name|${ext.dynamicData.name}`, ext);
        }
      }

      // Track items we are inserting/updating in this chunk to handle duplicates within the CSV itself
      const inMemoryProcessedMap = new Map();

      const chunkOps: any[] = [];
      for (const item of chunk) {
        const pkg = item.dynamicData?.package || '';
        const circle = item.dynamicData?.circle || '';
        
        let matchedExisting = null;
        let matchedInMemory = null;

        // Strictly prioritize SKU if available so items sharing the same name or tempCode are NOT wrongly merged/overwritten
        if (item.dynamicData?.sku) {
           matchedInMemory = inMemoryProcessedMap.get(`${pkg}|${circle}|sku|${item.dynamicData.sku}`);
           matchedExisting = dbItemsMap.get(`${pkg}|${circle}|sku|${item.dynamicData.sku}`);
        } else if (item.dynamicData?.tempCode && item.dynamicData.tempCode !== '0') {
           matchedInMemory = inMemoryProcessedMap.get(`${pkg}|${circle}|tempCode|${item.dynamicData.tempCode}`);
           matchedExisting = dbItemsMap.get(`${pkg}|${circle}|tempCode|${item.dynamicData.tempCode}`);
        } else if (item.dynamicData?.name) {
           matchedInMemory = inMemoryProcessedMap.get(`${pkg}|${circle}|name|${item.dynamicData.name}`);
           matchedExisting = dbItemsMap.get(`${pkg}|${circle}|name|${item.dynamicData.name}`);
        }

        if (matchedInMemory) {
           // We already processed this item in this chunk (duplicate row in CSV). Merge it in memory!
           matchedInMemory.dynamicData = { ...matchedInMemory.dynamicData, ...item.dynamicData };
           if (matchedInMemory._opRef.updateOne) {
              matchedInMemory._opRef.updateOne.update.$set.dynamicData = matchedInMemory.dynamicData;
           } else if (matchedInMemory._opRef.insertOne) {
              matchedInMemory._opRef.insertOne.document.dynamicData = matchedInMemory.dynamicData;
           }
        } else if (matchedExisting) {
           // Exists in DB
           const updatedDynamicData = { ...matchedExisting.dynamicData, ...item.dynamicData };
           const op = {
              updateOne: {
                 filter: { _id: matchedExisting._id },
                 update: {
                    $set: { dynamicData: updatedDynamicData, isDeleted: false },
                    $push: { history: { action: 'Updated via Import', performedBy: (req as any).user?._id || 'system', date: new Date() } }
                 }
              }
           };
           chunkOps.push(op);
           
           const memoryRef = { dynamicData: updatedDynamicData, _opRef: op };
           if (item.dynamicData?.sku) inMemoryProcessedMap.set(`${pkg}|${circle}|sku|${item.dynamicData.sku}`, memoryRef);
           else if (item.dynamicData?.tempCode && item.dynamicData.tempCode !== '0') inMemoryProcessedMap.set(`${pkg}|${circle}|tempCode|${item.dynamicData.tempCode}`, memoryRef);
           else if (item.dynamicData?.name) inMemoryProcessedMap.set(`${pkg}|${circle}|name|${item.dynamicData.name}`, memoryRef);
        } else {
           // Completely new item
           const op = { insertOne: { document: item } };
           chunkOps.push(op);
           
           const memoryRef = { dynamicData: item.dynamicData, _opRef: op };
           if (item.dynamicData?.sku) inMemoryProcessedMap.set(`${pkg}|${circle}|sku|${item.dynamicData.sku}`, memoryRef);
           else if (item.dynamicData?.tempCode && item.dynamicData.tempCode !== '0') inMemoryProcessedMap.set(`${pkg}|${circle}|tempCode|${item.dynamicData.tempCode}`, memoryRef);
           else if (item.dynamicData?.name) inMemoryProcessedMap.set(`${pkg}|${circle}|name|${item.dynamicData.name}`, memoryRef);
        }
      }
      
      if (chunkOps.length > 0) {
        await Item.bulkWrite(chunkOps);
      }
    }

    // Update Metadata Activity Options if new activities are imported
    if (validItems.length > 0) {
      const importedActivities = validItems.map(item => item.dynamicData.activity).filter(a => a && typeof a === 'string');
      if (importedActivities.length > 0) {
        const uniqueImported = Array.from(new Set(importedActivities));
        const meta = await Metadata.findOne({ entityName: 'Item' });
        if (meta) {
          const fields = (meta as any).fields;
          const activityField = fields.find((f: any) => f.name === 'activity');
          if (activityField) {
            const currentOptions = new Set(activityField.options || []);
            let added = false;
            for (const act of uniqueImported) {
              if (!currentOptions.has(act)) {
                currentOptions.add(act);
                added = true;
              }
            }
            if (added) {
              activityField.options = Array.from(currentOptions);
              await Metadata.updateOne({ entityName: 'Item' }, { $set: { fields } });
            }
          }
        }
      }
      }
    } catch (error) {
      throw error;
    }

    // After bulk write, rebuild summary for all affected items by their SKUs
    if (validItems.length > 0) {
      const skus = validItems.map(item => item.dynamicData.sku).filter(Boolean);
      if (skus.length > 0) {
        const affectedItems = await Item.find({ 'dynamicData.sku': { $in: skus } }).select('_id').lean();
        for (const affected of affectedItems) {
          SummaryService.rebuildForItem(affected._id.toString()).catch(console.error);
        }
      }
    }
  }

  res.status(200).json(new ApiResponse(200, { successCount: validItems.length }, 'Import processed successfully (updated or added items).'));
});

export const getItemMetrics = asyncHandler(async (req: Request, res: Response) => {
  const [circleStats, activityStats, circleActivityStats] = await Promise.all([
    Item.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$dynamicData.circle", count: { $sum: 1 } } }
    ]),
    Item.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$dynamicData.activity", count: { $sum: 1 } } }
    ]),
    Item.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: { circle: "$dynamicData.circle", activity: "$dynamicData.activity" }, count: { $sum: 1 } } }
    ])
  ]);
  
  res.status(200).json(new ApiResponse(200, { circleStats, activityStats, circleActivityStats }, 'Item metrics retrieved successfully'));
});
