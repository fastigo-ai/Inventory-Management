import { Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import Vendor from './vendor.model';
import Metadata from '../metadata/metadata.model';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
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

  const search = req.query.search as string;

  let sortObject: any = { createdAt: -1 };
  if (sortBy) {
    sortObject = { [`dynamicData.${sortBy}`]: sortOrder };
  }

  let matchQuery: any = { isDeleted: { $ne: true } };
  if (req.query.status) {
    matchQuery.status = req.query.status;
  }
  
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    matchQuery = {
      $or: [
        { 'dynamicData.companyName': searchRegex },
        { 'dynamicData.displayName': searchRegex },
        { 'dynamicData.primaryContact.firstName': searchRegex },
        { 'dynamicData.primaryContact.lastName': searchRegex },
        { 'dynamicData.phone.work': searchRegex },
        { 'dynamicData.phone.mobile': searchRegex }
      ]
    };
  }

  const skip = (page - 1) * limit;

  const totalVendors = await Vendor.countDocuments(matchQuery);
  const vendors = await Vendor.find(matchQuery)
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

export const updateVendor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dynamicData, status } = req.body;

  if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(404, 'Vendor not found');
  }

  const vendor = await Vendor.findById(id);
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  const metadata = await Metadata.findOne({ entityName: 'Vendor' });
  if (!metadata) {
    throw new ApiError(500, 'Vendor metadata configuration missing');
  }

  // Check if used in Purchase Orders to prevent name changes
  const vendorNameChecks = [
    vendor.dynamicData?.companyName,
    vendor.dynamicData?.displayName,
    vendor._id.toString()
  ].filter(Boolean);
  
  const inUse = await PurchaseOrder.exists({ vendorName: { $in: vendorNameChecks } });

  if (inUse && dynamicData) {
    const criticalFields = ['companyName', 'displayName'];
    for (const field of criticalFields) {
      if (dynamicData[field] !== undefined && dynamicData[field] !== vendor.dynamicData[field]) {
        throw new ApiError(400, `Cannot update critical field '${field}' because this vendor has active Purchase Orders.`);
      }
    }
  }

  if (dynamicData) {
    await validateDynamicData(dynamicData, metadata.fields, id);
    vendor.dynamicData = dynamicData;
  }

  if (status && ['Active', 'Inactive'].includes(status)) {
    vendor.status = status;
  }

  await vendor.save();

  res.status(200).json(new ApiResponse(200, vendor, 'Vendor updated successfully'));
});

export const deleteVendor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(404, 'Vendor not found');
  }

  const vendor = await Vendor.findById(id);
  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  const vendorNameChecks = [
    vendor.dynamicData?.companyName,
    vendor.dynamicData?.displayName,
    vendor._id.toString()
  ].filter(Boolean);

  const inUse = await PurchaseOrder.exists({ vendorName: { $in: vendorNameChecks } });
  
  if (inUse) {
    throw new ApiError(400, 'Cannot delete this vendor as it is linked to one or more Purchase Orders. Please mark it as Inactive instead.');
  }

  // If not in use, we can safely soft delete (or hard delete, but soft delete is safer)
  vendor.isDeleted = true;
  await vendor.save();

  res.status(200).json(new ApiResponse(200, {}, 'Vendor deleted successfully'));
});

export const exportVendors = asyncHandler(async (req: Request, res: Response) => {
  const metadata = await Metadata.findOne({ entityName: 'Vendor' });
  if (!metadata) {
    throw new ApiError(500, 'Vendor metadata configuration missing');
  }

  const vendors = await Vendor.find({}).sort({ createdAt: -1 });
  
  // Headers based on metadata labels, expanding compound fields
  const headers: string[] = [];
  const expandHeaders = (field: any) => {
    if (field.widget === 'vendor_address') {
      headers.push(
        'Billing Attention', 'Billing Country', 'Billing Street 1', 'Billing Street 2', 'Billing City', 'Billing State', 'Billing Zip',
        'Shipping Attention', 'Shipping Country', 'Shipping Street 1', 'Shipping Street 2', 'Shipping City', 'Shipping State', 'Shipping Zip'
      );
    } else if (field.widget === 'vendor_contact_persons') {
      headers.push('Contact Salutation', 'Contact First Name', 'Contact Last Name', 'Contact Email', 'Contact Work Phone', 'Contact Mobile');
    } else if (field.widget === 'vendor_bank_details') {
      headers.push('Bank Account Holder', 'Bank Name', 'Bank Account Number', 'Bank IFSC Code');
    } else if (field.widget === 'vendor_primary_contact') {
      headers.push('Primary Contact Salutation', 'Primary Contact First Name', 'Primary Contact Last Name');
    } else if (field.widget === 'vendor_phone') {
      headers.push('Work Phone Code', 'Work Phone', 'Mobile Phone Code', 'Mobile Phone');
    } else if (field.type !== 'compound') {
      headers.push(field.label);
    }
  };

  metadata.fields.forEach(expandHeaders);
  
  // Build rows mapping dynamicData back to labels
  const rows = vendors.map(vendor => {
    const row: any = {};
    for (const field of metadata.fields) {
      const val = vendor.dynamicData?.[field.name];
      if (field.widget === 'vendor_address') {
        row['Billing Attention'] = val?.billing?.attention || '';
        row['Billing Country'] = val?.billing?.country || '';
        row['Billing Street 1'] = val?.billing?.street1 || '';
        row['Billing Street 2'] = val?.billing?.street2 || '';
        row['Billing City'] = val?.billing?.city || '';
        row['Billing State'] = val?.billing?.state || '';
        row['Billing Zip'] = val?.billing?.zip || '';
        
        row['Shipping Attention'] = val?.shipping?.attention || '';
        row['Shipping Country'] = val?.shipping?.country || '';
        row['Shipping Street 1'] = val?.shipping?.street1 || '';
        row['Shipping Street 2'] = val?.shipping?.street2 || '';
        row['Shipping City'] = val?.shipping?.city || '';
        row['Shipping State'] = val?.shipping?.state || '';
        row['Shipping Zip'] = val?.shipping?.zip || '';
      } else if (field.widget === 'vendor_contact_persons') {
        const cp = Array.isArray(val) && val.length > 0 ? val[0] : {};
        row['Contact Salutation'] = cp.salutation || '';
        row['Contact First Name'] = cp.firstName || '';
        row['Contact Last Name'] = cp.lastName || '';
        row['Contact Email'] = cp.email || '';
        row['Contact Work Phone'] = cp.workPhone || '';
        row['Contact Mobile'] = cp.mobile || '';
      } else if (field.widget === 'vendor_bank_details') {
        const bk = Array.isArray(val) && val.length > 0 ? val[0] : {};
        row['Bank Account Holder'] = bk.accountHolderName || '';
        row['Bank Name'] = bk.bankName || '';
        row['Bank Account Number'] = bk.accountNumber || '';
        row['Bank IFSC Code'] = bk.ifsc || '';
      } else if (field.widget === 'vendor_primary_contact') {
        row['Primary Contact Salutation'] = val?.salutation || '';
        row['Primary Contact First Name'] = val?.firstName || '';
        row['Primary Contact Last Name'] = val?.lastName || '';
      } else if (field.widget === 'vendor_phone') {
        row['Work Phone Code'] = val?.workCountryCode || '';
        row['Work Phone'] = val?.work || '';
        row['Mobile Phone Code'] = val?.mobileCountryCode || '';
        row['Mobile Phone'] = val?.mobile || '';
      } else if (field.type !== 'compound') {
        row[field.label] = val ?? '';
      }
    }
    return row;
  });

  const csv = stringify(rows, { header: true, columns: headers });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vendors_export.csv"');
  res.send(csv);
});

export const exportVendorTemplate = asyncHandler(async (req: Request, res: Response) => {
  const metadata = await Metadata.findOne({ entityName: 'Vendor' });
  if (!metadata) {
    throw new ApiError(500, 'Vendor metadata configuration missing');
  }

  // Headers based on metadata labels, expanding compound fields
  const headers: string[] = [];
  const expandHeaders = (field: any) => {
    if (field.widget === 'vendor_address') {
      headers.push(
        'Billing Attention', 'Billing Country', 'Billing Street 1', 'Billing Street 2', 'Billing City', 'Billing State', 'Billing Zip',
        'Shipping Attention', 'Shipping Country', 'Shipping Street 1', 'Shipping Street 2', 'Shipping City', 'Shipping State', 'Shipping Zip'
      );
    } else if (field.widget === 'vendor_contact_persons') {
      headers.push('Contact Salutation', 'Contact First Name', 'Contact Last Name', 'Contact Email', 'Contact Work Phone', 'Contact Mobile');
    } else if (field.widget === 'vendor_bank_details') {
      headers.push('Bank Account Holder', 'Bank Name', 'Bank Account Number', 'Bank IFSC Code');
    } else if (field.widget === 'vendor_primary_contact') {
      headers.push('Primary Contact Salutation', 'Primary Contact First Name', 'Primary Contact Last Name');
    } else if (field.widget === 'vendor_phone') {
      headers.push('Work Phone Code', 'Work Phone', 'Mobile Phone Code', 'Mobile Phone');
    } else if (field.type !== 'compound') {
      headers.push(field.label);
    }
  };

  metadata.fields.forEach(expandHeaders);
  
  const mockRow: Record<string, string> = {};
  headers.forEach(header => {
    const lower = header.toLowerCase();
    if (lower.includes('email')) {
      mockRow[header] = 'sample@example.com';
    } else if (lower.includes('phone') || lower.includes('mobile')) {
      mockRow[header] = '1234567890';
    } else if (lower.includes('date')) {
      mockRow[header] = '2023-12-31';
    } else if (lower.includes('zip')) {
      mockRow[header] = '10001';
    } else if (lower.includes('country')) {
      mockRow[header] = 'USA';
    } else if (lower.includes('city')) {
      mockRow[header] = 'New York';
    } else if (lower.includes('state')) {
      mockRow[header] = 'NY';
    } else if (lower.includes('street')) {
      mockRow[header] = '123 Main St';
    } else if (lower.includes('company') || lower === 'vendor name') {
      mockRow[header] = 'Acme Corp';
    } else if (lower.includes('name') || lower.includes('attention') || lower.includes('holder')) {
      mockRow[header] = 'John Doe';
    } else if (lower.includes('salutation')) {
      mockRow[header] = 'Mr.';
    } else if (lower.includes('currency')) {
      mockRow[header] = 'USD';
    } else if (lower.includes('payment terms')) {
      mockRow[header] = 'Net 30';
    } else {
      mockRow[header] = 'Sample Data';
    }
  });

  const csv = stringify([mockRow], { header: true, columns: headers });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vendors_template.csv"');
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

      // Reconstruct compound fields
      if (row['Billing Attention'] !== undefined || row['Shipping Attention'] !== undefined) {
        dynamicData.vendorAddresses = {
          billing: {
            attention: row['Billing Attention'] || '',
            country: row['Billing Country'] || '',
            street1: row['Billing Street 1'] || '',
            street2: row['Billing Street 2'] || '',
            city: row['Billing City'] || '',
            state: row['Billing State'] || '',
            zip: row['Billing Zip'] || '',
            phone: row['Billing Phone'] || '',
            fax: row['Billing Fax'] || ''
          },
          shipping: {
            attention: row['Shipping Attention'] || '',
            country: row['Shipping Country'] || '',
            street1: row['Shipping Street 1'] || '',
            street2: row['Shipping Street 2'] || '',
            city: row['Shipping City'] || '',
            state: row['Shipping State'] || '',
            zip: row['Shipping Zip'] || '',
            phone: row['Shipping Phone'] || '',
            fax: row['Shipping Fax'] || ''
          }
        };
      }
      
      const normalizeSalutation = (val: string): string => {
        if (!val) return '';
        const cleaned = val.trim().toLowerCase().replace(/\.$/, '');
        switch (cleaned) {
          case 'mr': return 'Mr.';
          case 'mrs': return 'Mrs.';
          case 'ms': return 'Ms.';
          case 'miss': return 'Miss.';
          case 'dr': return 'Dr.';
          default:
            return val.trim() ? val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase() : '';
        }
      };

      if (row['Contact Salutation'] !== undefined || row['Contact First Name'] !== undefined) {
        dynamicData.contactPersons = [{
          salutation: normalizeSalutation(row['Contact Salutation'] || ''),
          firstName: row['Contact First Name'] || '',
          lastName: row['Contact Last Name'] || '',
          email: row['Contact Email'] || '',
          workPhone: row['Contact Work Phone'] || '',
          mobile: row['Contact Mobile'] || ''
        }];
      }

      if (row['Bank Account Holder'] !== undefined || row['Bank Account Number'] !== undefined || row['Bank IFSC Code'] !== undefined) {
        dynamicData.bankDetails = [{
          accountHolderName: row['Bank Account Holder'] || '',
          bankName: row['Bank Name'] || '',
          accountNumber: row['Bank Account Number'] || '',
          ifsc: row['Bank IFSC Code'] || ''
        }];
      }

      if (row['Primary Contact First Name'] !== undefined) {
        dynamicData.primaryContact = {
          salutation: normalizeSalutation(row['Primary Contact Salutation'] || ''),
          firstName: row['Primary Contact First Name'] || '',
          lastName: row['Primary Contact Last Name'] || ''
        };
      }

      if (row['Work Phone'] !== undefined || row['Mobile Phone'] !== undefined) {
        dynamicData.phone = {
          workCountryCode: row['Work Phone Code'] || '',
          work: row['Work Phone'] || '',
          mobileCountryCode: row['Mobile Phone Code'] || '',
          mobile: row['Mobile Phone'] || ''
        };
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
