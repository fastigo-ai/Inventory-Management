import { Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import Vendor from './vendor.model';
import Metadata from '../metadata/metadata.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';

const validateDynamicData = async (data: any, metadataFields: any[], currentVendorId?: string) => {
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
      if (currentVendorId) {
        query._id = { $ne: currentVendorId };
      }
      
      const existing = await Vendor.findOne(query);
      if (existing) {
        errors.push(`The ${field.label} '${value}' is already in use.`);
      }
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, 'Validation failed', errors);
  }
};

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const { dynamicData } = req.body;

  const metadata = await Metadata.findOne({ entityName: 'Vendor' });
  if (!metadata) {
    throw new ApiError(500, 'Vendor metadata configuration missing');
  }

  await validateDynamicData(dynamicData, metadata.fields);

  const vendor = await Vendor.create({ dynamicData });

  res.status(201).json(new ApiResponse(201, vendor, 'Vendor created successfully'));
});

export const getVendors = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const sortBy = req.query.sortBy as string;
  const sortOrder = (req.query.sortOrder as string) === 'desc' ? -1 : 1;

  let sortObject: any = { createdAt: -1 };
  if (sortBy) {
    sortObject = { [`dynamicData.${sortBy}`]: sortOrder };
  }

  const skip = (page - 1) * limit;

  const totalVendors = await Vendor.countDocuments();
  const vendors = await Vendor.find({})
    .sort(sortObject)
    .collation({ locale: 'en', numericOrdering: true }) // helps sort numbers/strings nicely
    .skip(skip)
    .limit(limit);

  res.status(200).json(new ApiResponse(200, {
    vendors,
    pagination: {
      totalVendors,
      currentPage: page,
      limit,
      totalPages: Math.ceil(totalVendors / limit)
    }
  }, 'Vendors fetched successfully'));
});

export const getVendorById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Validate ObjectId to prevent 500 CastErrors
  if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(404, 'Vendor not found');
  }

  const vendor = await Vendor.findById(id);
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }
  res.status(200).json(new ApiResponse(200, vendor, 'Vendor fetched successfully'));
});

export const exportVendors = asyncHandler(async (req: Request, res: Response) => {
  const metadata = await Metadata.findOne({ entityName: 'Vendor' });
  if (!metadata) {
    throw new ApiError(500, 'Vendor metadata configuration missing');
  }

  const vendors = await Vendor.find({}).sort({ createdAt: -1 });
  
  // Headers based on metadata labels
  const headers = metadata.fields.map((f: any) => f.label);
  
  // Build rows mapping dynamicData back to labels
  const rows = vendors.map(vendor => {
    const row: any = {};
    for (const field of metadata.fields) {
      row[field.label] = vendor.dynamicData?.[field.name] ?? '';
    }
    return row;
  });

  const csv = stringify(rows, { header: true, columns: headers });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vendors_export.csv"');
  res.send(csv);
});

export const importVendors = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No CSV file uploaded');
  }

  const metadata = await Metadata.findOne({ entityName: 'Vendor' });
  if (!metadata) {
    throw new ApiError(500, 'Vendor metadata configuration missing');
  }

  const results: any[] = [];
  const errors: any[] = [];
  const validVendors: any[] = [];

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
    'name': 'displayName',
    'company': 'companyName',
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
      
      // If validation passed, push to valid vendors array
      validVendors.push({ dynamicData });

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
    return res.status(400).json(new ApiResponse(400, { errors }, 'Import failed due to validation errors. No vendors were imported.'));
  }

  // Batch Uniqueness Check against Database
  if (uniqueFields.length > 0 && validVendors.length > 0) {
    const orConditions = [];
    for (const uField of uniqueFields) {
      const values = validVendors.map(vendor => vendor.dynamicData[uField]).filter(Boolean);
      if (values.length > 0) {
        orConditions.push({ [`dynamicData.${uField}`]: { $in: values } });
      }
    }
    
    if (orConditions.length > 0) {
      const existingDuplicates = await Vendor.find({ $or: orConditions }).select('dynamicData').lean();
      
      if (existingDuplicates.length > 0) {
        const duplicateDetails = new Set<string>();
        for (const existing of existingDuplicates) {
          for (const uField of uniqueFields) {
            const val = (existing as any).dynamicData?.[uField];
            if (val && validVendors.some(vendor => vendor.dynamicData[uField] === val)) {
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
  await Vendor.insertMany(validVendors);

  res.status(200).json(new ApiResponse(200, { successCount: validVendors.length }, 'Import processed successfully'));
});
