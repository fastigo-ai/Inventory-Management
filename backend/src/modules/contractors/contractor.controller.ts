import { Request, Response } from 'express';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { Contractor } from './contractor.schema';
import { ContractorAssignment } from './contractorAssignment.schema';
import { ContractorReturn } from './contractorReturn.schema';
import Metadata from '../metadata/metadata.model';
import Item from '../items/item.model';
import mongoose from 'mongoose';
import { JmcRegister } from "../jmc/jmc.schema";
import { WipRegister } from "../wip/wip.schema";
import { WipRequiredRegister } from "../wip-required/wipRequired.schema";
import DemandNote from '../demand-notes/demandNote.schema';
import { SummaryService } from '../reports/summary/summary.service';


export const getContractors = asyncHandler(async (req: Request, res: Response) => {
  const { location, search } = req.query;
  const filter: any = { isActive: true };
  
  const conditions = [];

  if (location) {
    const locStr = String(location).trim();
    const locRegex = new RegExp(`^${locStr}$`, 'i');
    conditions.push({
      $or: [
        { location: locRegex },
        { assignedLocations: locRegex },
        { 'dynamicData.circle': locRegex },
        { 'dynamicData.assignedCircle': locRegex },
        { 'dynamicData.assignedCircles': locRegex },
        // Substring match in case it's a comma separated string
        { 'dynamicData.assignedCircle': { $regex: location, $options: 'i' } }
      ]
    });
  }

  if (search) {
    const searchRegex = new RegExp(String(search), 'i');
    conditions.push({
      $or: [
        { 'dynamicData.displayName': searchRegex },
        { 'dynamicData.name': searchRegex },
        { 'dynamicData.companyName': searchRegex },
        { 'dynamicData.vendorName': searchRegex }
      ]
    });
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const { page, limit } = req.query;
  
  if (page && limit) {
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Contractor.countDocuments(filter);
    const contractors = await Contractor.find(filter)
      .sort({ 'dynamicData.displayName': 1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json(new ApiResponse(200, {
      contractors,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber)
    }, 'Contractors fetched successfully'));
  }

  const contractors = await Contractor.find(filter).sort({ 'dynamicData.displayName': 1 });
  res.status(200).json(new ApiResponse(200, contractors, 'Contractors fetched successfully'));
});

export const getContractorById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (typeof id !== 'string' || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(404, 'Contractor not found');
  }

  const contractor = await Contractor.findById(id);
  if (!contractor) {
    throw new ApiError(404, 'Contractor not found');
  }
  res.status(200).json(new ApiResponse(200, contractor, 'Contractor fetched successfully'));
});

export const createContractor = asyncHandler(async (req: Request, res: Response) => {
  const { location, dynamicData } = req.body;
  const contractor = await Contractor.create({ location, dynamicData });
  res.status(201).json(new ApiResponse(201, contractor, 'Contractor created successfully'));
});

export const getAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { contractorId, page, limit, search, startDate, endDate } = req.query;
  const user = (req as any).user;
  const filter: any = {};
  
  if (contractorId) {
    filter.contractorId = contractorId;
  }
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }

  const SUB_STORE_MAP: Record<string, string[]> = {
    'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
    'Nahan': ['Nahan'],
    'Rohru': ['Rohru'],
    'Rampur': ['Rampur'],
  };

  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
    if (user.assignedPackage && user.assignedPackage.trim()) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    if (user.assignedSubcircle) {
      filter.subcircle = { $regex: new RegExp(`^\\s*${user.assignedSubcircle.trim()}\\s*$`, 'i') };
    } else if (user.assignedCircle) {
      const allowedCircles = SUB_STORE_MAP[user.assignedCircle] || [user.assignedCircle];
      const regexCircles = allowedCircles.map(c => new RegExp(`^${c}$`, 'i'));
      filter.$or = [
        { location: { $in: regexCircles } },
        { circle: { $in: regexCircles } }
      ];
    }
  }

  // Handle Search inside assignments (by AssignmentNumber or MIN No)
  if (search) {
    const searchStr = String(search);
    if (/^\d+$/.test(searchStr)) {
      filter.assignmentNumber = searchStr;
    } else {
      filter.assignmentNumber = { $regex: new RegExp(searchStr, 'i') };
    }
  }
  
  if (page && limit) {
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await ContractorAssignment.countDocuments(filter);
    const assignments = await ContractorAssignment.find(filter)
      .populate('contractorId', 'dynamicData.displayName name farmName companyName')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json(new ApiResponse(200, {
      assignments,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber)
    }, 'Assignments fetched successfully'));
  }

  const assignments = await ContractorAssignment.find(filter)
    .populate('contractorId', 'dynamicData.displayName name farmName companyName')
    .sort({ createdAt: 1 });
  res.status(200).json(new ApiResponse(200, assignments, 'Assignments fetched successfully'));
});

export const getAssignmentSummary = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, contractorId, search } = req.query;
  const user = (req as any).user;
  const filter: any = {};
  
  if (contractorId) filter.contractorId = new mongoose.Types.ObjectId(contractorId as string);
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }

  const SUB_STORE_MAP: Record<string, string[]> = {
    'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
    'Nahan': ['Nahan'],
    'Rohru': ['Rohru'],
    'Rampur': ['Rampur'],
  };

  if (user && user.role?.name !== 'Admin' && user.role?.name !== 'Super Admin' && !user.role?.permissions?.includes('*')) {
    if (user.assignedPackage && user.assignedPackage.trim()) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    if (user.assignedSubcircle) {
      filter.subcircle = { $regex: new RegExp(`^\\s*${user.assignedSubcircle.trim()}\\s*$`, 'i') };
    } else if (user.assignedCircle) {
      const allowedCircles = SUB_STORE_MAP[user.assignedCircle] || [user.assignedCircle];
      const regexCircles = allowedCircles.map(c => new RegExp(`^${c}$`, 'i'));
      filter.$or = [
        { location: { $in: regexCircles } },
        { circle: { $in: regexCircles } }
      ];
    }
  }

  if (search) {
    const searchStr = String(search);
    if (/^\d+$/.test(searchStr)) {
      filter.assignmentNumber = searchStr;
    } else {
      filter.assignmentNumber = { $regex: new RegExp(searchStr, 'i') };
    }
  }

  const summary = await ContractorAssignment.aggregate([
    { $match: filter },
    { 
      $group: {
        _id: null,
        totalMins: { $sum: 1 },
        activeContractors: { $addToSet: "$contractorId" },
        totalItemsIssued: { $sum: { $sum: "$lineItems.quantity" } },
        totalValue: { $sum: "$total" }
      }
    },
    {
      $project: {
        _id: 0,
        totalMins: 1,
        activeContractors: { $size: "$activeContractors" },
        totalItemsIssued: 1,
        totalValue: 1
      }
    }
  ]);

  const result = summary[0] || {
    totalMins: 0,
    activeContractors: 0,
    totalItemsIssued: 0,
    totalValue: 0
  };

  res.status(200).json(new ApiResponse(200, result, 'Summary fetched successfully'));
});

export const getAssignmentById = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await ContractorAssignment.findById(req.params.id)
    .populate('contractorId', 'dynamicData.displayName name farmName companyName');
    
  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }
  
  res.status(200).json(new ApiResponse(200, assignment, 'Assignment fetched successfully'));
});

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignmentData = req.body;

  if (!assignmentData.assignmentNumber || !assignmentData.contractorId || !assignmentData.lineItems || assignmentData.lineItems.length === 0) {
    throw new ApiError(400, 'Assignment Number, Contractor, and Line Items are required');
  }

  const existing = await ContractorAssignment.findOne({ 
    assignmentNumber: assignmentData.assignmentNumber,
    subcircle: assignmentData.subcircle
  });
  if (existing) {
    throw new ApiError(400, `Assignment with number ${assignmentData.assignmentNumber} already exists in this subcircle`);
  }

  const newAssignment = await ContractorAssignment.create(assignmentData);

  // Fulfill the associated Demand Note if one exists
  if (assignmentData.demandNo) {
    await DemandNote.findOneAndUpdate(
      { demandNoteNumber: assignmentData.demandNo },
      { status: 'Fulfilled' }
    );
  }

  if (newAssignment && newAssignment.lineItems) {
    newAssignment.lineItems.forEach((li: any) => {
      if (li.itemId) SummaryService.rebuildForItem(li.itemId.toString()).catch(console.error);
    });
  }

  res.status(201).json(new ApiResponse(201, newAssignment, 'Contractor Assignment created successfully'));
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  const existing = await ContractorAssignment.findById(id);
  if (!existing) {
    throw new ApiError(404, 'Assignment not found');
  }

  // If status is Cancelled, prevent edit
  if (existing.status === 'Cancelled') {
    throw new ApiError(400, 'Cannot edit a cancelled assignment');
  }

  const updatedAssignment = await ContractorAssignment.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  if (updatedAssignment && updatedAssignment.lineItems) {
    updatedAssignment.lineItems.forEach((li: any) => {
      if (li.itemId) SummaryService.rebuildForItem(li.itemId.toString()).catch(console.error);
    });
  }

  res.status(200).json(new ApiResponse(200, updatedAssignment, 'Contractor Assignment updated successfully'));
});

export const cancelAssignment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const assignment = await ContractorAssignment.findById(id);
  if (!assignment) {
    throw new ApiError(404, 'Assignment not found');
  }

  if (assignment.status === 'Cancelled') {
    throw new ApiError(400, 'Assignment is already cancelled');
  }

  assignment.status = 'Cancelled';
  await assignment.save();

  if (assignment && assignment.lineItems) {
    assignment.lineItems.forEach((li: any) => {
      if (li.itemId) SummaryService.rebuildForItem(li.itemId.toString()).catch(console.error);
    });
  }

  res.status(200).json(new ApiResponse(200, assignment, 'Contractor Assignment cancelled successfully'));
});

export const assignContractor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { locations } = req.body;

  if (!Array.isArray(locations)) {
    throw new ApiError(400, 'Locations must be an array of strings');
  }

  const contractor = await Contractor.findByIdAndUpdate(
    id,
    { assignedLocations: locations },
    { new: true, runValidators: true }
  );

  if (!contractor) {
    throw new ApiError(404, 'Contractor not found');
  }

  res.status(200).json(new ApiResponse(200, contractor, 'Contractor locations updated successfully'));
});

export const updateContractor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dynamicData, isActive } = req.body;

  const updatePayload: any = {};
  if (dynamicData) {
    updatePayload.dynamicData = dynamicData;
  }
  if (isActive !== undefined) {
    updatePayload.isActive = isActive;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new ApiError(400, 'dynamicData or isActive is required');
  }

  const contractor = await Contractor.findByIdAndUpdate(
    id,
    updatePayload,
    { new: true, runValidators: true }
  );

  if (!contractor) {
    throw new ApiError(404, 'Contractor not found');
  }

  res.status(200).json(new ApiResponse(200, contractor, 'Contractor updated successfully'));
});

export const deleteContractor = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const contractor = await Contractor.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!contractor) {
    throw new ApiError(404, 'Contractor not found');
  }

  res.status(200).json(new ApiResponse(200, null, 'Contractor deleted successfully'));
});

export const exportTemplate = asyncHandler(async (req: Request, res: Response) => {
  const metadata = await Metadata.findOne({ entityName: 'Contractor' });
  if (!metadata) {
    throw new ApiError(500, 'Contractor metadata configuration missing');
  }

  const headers: string[] = [];
  const expandHeaders = (field: any) => {
    if (field.widget === 'single_address') {
      headers.push(
        'Billing Attention', 'Billing Country', 'Billing Street 1', 'Billing Street 2', 'Billing City', 'Billing State', 'Billing Zip'
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

  const csv = stringify([headers]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=contractors_template.csv');
  res.send(csv);
});

export const importContractors = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'CSV file is required');
  }

  const metadata = await Metadata.findOne({ entityName: 'Contractor' });
  if (!metadata) {
    throw new ApiError(500, 'Contractor metadata configuration missing');
  }

  const fileContent = req.file.buffer.toString('utf-8');
  
  const records: any[] = await new Promise((resolve, reject) => {
    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  if (records.length === 0) {
    throw new ApiError(400, 'CSV file is empty or invalid');
  }

  const errors: any[] = [];
  const validContractors: any[] = [];

  const uniqueFields = metadata.fields.filter(f => f.unique).map(f => f.name);
  const seenUniqueValues: Record<string, Set<string>> = {};
  uniqueFields.forEach(f => seenUniqueValues[f] = new Set());

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowIndex = i + 2;
    const dynamicData: any = {};

    try {
      
      if (row['Billing Attention'] !== undefined || row['Billing City'] !== undefined) {
        dynamicData.contractorAddress = {
          billing: {
            attention: row['Billing Attention'] || '',
            country: row['Billing Country'] || '',
            street1: row['Billing Street 1'] || '',
            street2: row['Billing Street 2'] || '',
            city: row['Billing City'] || '',
            state: row['Billing State'] || '',
            zip: row['Billing Zip'] || '',
            phone: '',
            fax: ''
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
        if (field.type !== 'compound' && row[field.label] !== undefined && row[field.label] !== '') {
           if (['number', 'decimal', 'amount'].includes(field.type)) {
              const val = Number(row[field.label]);
              if (isNaN(val)) throw new Error(`Invalid number for ${field.label}`);
              dynamicData[field.name] = val;
           } else if (field.type === 'boolean') {
              const val = String(row[field.label]).toLowerCase();
              dynamicData[field.name] = val === 'yes' || val === 'true' || val === '1';
           } else {
              dynamicData[field.name] = row[field.label];
           }
        }
      }

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

      for (const field of metadata.fields) {
         if (field.required) {
            const value = dynamicData[field.name];
            if (value === undefined || value === null || value === '') {
               rowErrors.push(`${field.label} is required.`);
            }
         }
      }
      
      validContractors.push({ dynamicData });

    } catch (err: any) {
      errors.push({
        row: rowIndex,
        message: err.message || 'Validation failed',
        details: err.errors || []
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(new ApiResponse(400, { errors }, 'Import failed due to validation errors. No contractors were imported.'));
  }

  if (uniqueFields.length > 0 && validContractors.length > 0) {
    const orConditions = [];
    for (const uField of uniqueFields) {
      const values = validContractors.map(c => c.dynamicData[uField]).filter(Boolean);
      if (values.length > 0) {
        orConditions.push({ [`dynamicData.${uField}`]: { $in: values } });
      }
    }
    
    if (orConditions.length > 0) {
      const existingDuplicates = await Contractor.find({ $or: orConditions }).select('dynamicData').lean();
      
      if (existingDuplicates.length > 0) {
        const duplicateDetails = new Set<string>();
        for (const existing of existingDuplicates) {
          for (const uField of uniqueFields) {
            const val = (existing as any).dynamicData?.[uField];
            if (val && validContractors.some(c => c.dynamicData[uField] === val)) {
              duplicateDetails.add(`The value '${val}' for field '${uField}' already exists in the database.`);
            }
          }
        }
        
        if (duplicateDetails.size > 0) {
          require('fs').writeFileSync('last_upload_error.txt', JSON.stringify(errors, null, 2));
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

  try {
    await Contractor.insertMany(validContractors);
  } catch (error) {
    throw error;
  }

  res.status(200).json(new ApiResponse(200, { successCount: validContractors.length }, 'Import processed successfully'));
});

export const getContractorReturns = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  let filter: any = {};

  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedSubcircle) {
      filter.circle = { $regex: new RegExp(`^${user.assignedSubcircle.trim()}$`, 'i') };
    } else if (user.assignedCircle) {
      const SUB_STORE_MAP: Record<string, string[]> = {
        'solan': ['Solan', 'Nalagarh', 'Kumarhatti'],
        'nahan': ['Nahan'],
        'rohru': ['Rohru'],
        'rampur': ['Rampur'],
      };
      const normalizedCircle = user.assignedCircle.trim().toLowerCase();
      const allowedCircles = SUB_STORE_MAP[normalizedCircle] || [user.assignedCircle];
      const regexCircles = allowedCircles.map(c => new RegExp(`^${c}$`, 'i'));
      filter.circle = { $in: regexCircles };
    }
  }

  const returns = await ContractorReturn.find(filter)
    .populate('contractorId', 'dynamicData')
    .sort({ createdAt: 1 });

  res.status(200).json(
    new ApiResponse(200, returns, 'Contractor returns fetched successfully')
  );
});

export const createContractorReturn = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  
  if (!data.returnChallanNo || !data.contractorId) {
    throw new ApiError(400, 'Return Challan No and Contractor are required');
  }

  const existing = await ContractorReturn.findOne({ returnChallanNo: data.returnChallanNo });
  if (existing) {
    throw new ApiError(400, 'A return with this Challan No already exists');
  }
  data.createdBy = (req as any).user?._id;
  if ((req as any).user?.assignedCircle) {
    data.circle = (req as any).user?.assignedCircle;
  }
  const newReturn = await ContractorReturn.create(data);

  if (newReturn && newReturn.lineItems) {
    newReturn.lineItems.forEach((li: any) => {
      if (li.itemId) SummaryService.rebuildForItem(li.itemId.toString()).catch(console.error);
    });
  }

  res.status(201).json(
    new ApiResponse(201, newReturn, 'Contractor return created successfully')
  );
});

export const getContractorReturnById = asyncHandler(async (req: Request, res: Response) => {
  const returnObj = await ContractorReturn.findById(req.params.id)
    .populate('contractorId', 'dynamicData')
    .populate('lineItems.itemId', 'itemCode description unit');
  if (!returnObj) throw new ApiError(404, 'Contractor return not found');
  res.status(200).json(new ApiResponse(200, returnObj, 'Contractor return fetched successfully'));
});

export const updateContractorReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const returnObj = await ContractorReturn.findByIdAndUpdate(id, data, { new: true });
  if (!returnObj) throw new ApiError(404, 'Contractor return not found');

  if (returnObj && returnObj.lineItems) {
    returnObj.lineItems.forEach((li: any) => {
      if (li.itemId) SummaryService.rebuildForItem(li.itemId.toString()).catch(console.error);
    });
  }

  res.status(200).json(new ApiResponse(200, returnObj, 'Contractor return updated successfully'));
});

export const deleteContractorReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const returnObj = await ContractorReturn.findByIdAndDelete(id);
  if (!returnObj) throw new ApiError(404, 'Contractor return not found');

  if (returnObj && returnObj.lineItems) {
    returnObj.lineItems.forEach((li: any) => {
      if (li.itemId) SummaryService.rebuildForItem(li.itemId.toString()).catch(console.error);
    });
  }

  res.status(200).json(new ApiResponse(200, null, 'Contractor return deleted successfully'));
});

export const bulkImportContractorReturns = asyncHandler(async (req: Request, res: Response) => {
  console.log("Req headers:", req.headers["content-type"]);
  console.log("Req file:", req.file);
  console.log("Req body:", req.body);
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);

  const errors: string[] = [];
  let successCount = 0;
  
  const returnsByChallan: Record<string, any> = {};
  
  // Pre-fetch all Contractors for robust matching
  const allContractors = await Contractor.find({}).lean();
  const contractorCache = new Map();
  for (const c of allContractors) {
    if (c.name) contractorCache.set(c.name.replace(/\s+/g, '').toLowerCase(), c);
    if (c.dynamicData?.displayName) contractorCache.set(c.dynamicData.displayName.replace(/\s+/g, '').toLowerCase(), c);
    if (c.dynamicData?.companyName) contractorCache.set(c.dynamicData.companyName.replace(/\s+/g, '').toLowerCase(), c);
  }

  // Pre-fetch all Items for O(1) matching instead of N+1 regex queries
  const allItems = await Item.find({}).select('_id itemCode description hsnCode unit dynamicData').lean();
  const itemCacheByTempCode = new Map();
  const itemCacheByName = new Map();
  for (const it of allItems) {
    if (it.dynamicData?.tempCode) itemCacheByTempCode.set(String(it.dynamicData.tempCode).trim(), it);
    if (it.dynamicData?.description) itemCacheByName.set(String(it.dynamicData.description).trim().toLowerCase(), it);
  }

  for await (const row of parser) {
    try {
      const challanNo = row['Return Challan No.'] || row['ReturnChallanNo'] || '';
      if (!challanNo) {
        const isEmpty = Object.values(row).every(v => !v || String(v).trim() === '');
        if (isEmpty) continue;
        errors.push(`Row missing Return Challan No.`);
        continue;
      }

      const contractorName = row['Contractor Name'] || '';
      let contractor = null;
      if (contractorName) {
        const contractorKey = contractorName.trim().replace(/\s+/g, '').toLowerCase();
        contractor = contractorCache.get(contractorKey);
      }
      
      if (!contractor) {
        errors.push(`Contractor '${contractorName}' not found for Challan ${challanNo}`);
        continue;
      }

      const itemName = row['Description of Material'] || '';
      const tempCode = row['Temp Code'] || '';
      const returnQty = Number(row['Return QTY.'] || row['ReturnQty'] || 0);

      let item = null;
      if (tempCode) {
        item = itemCacheByTempCode.get(String(tempCode).trim());
      }
      if (!item && itemName) {
        item = itemCacheByName.get(String(itemName).trim().toLowerCase());
      }

      const itemDynamic = item?.dynamicData || {};
      const masterUnit = itemDynamic.unit || itemDynamic.uom || item?.unit || item?.uom || 'Nos';
      const csvUnit = row['Unit'] || row['UNIT'];
      
      if (csvUnit && String(csvUnit).trim() !== '' && String(csvUnit).trim().replace(/\.$/, '').toLowerCase() !== String(masterUnit).trim().replace(/\.$/, '').toLowerCase()) {
        errors.push(`Unit mismatch for item '${itemName || tempCode}' in Challan ${challanNo}. Expected '${masterUnit}', got '${csvUnit}'`);
        continue;
      }
      
      const unit = csvUnit && String(csvUnit).trim() !== '' ? String(csvUnit).trim() : masterUnit;

      const lineItem = {
        itemId: item ? item._id : undefined,
        itemName: item?.description || itemName,
        tempCode: item?.itemCode || tempCode,
        hsnCode: row['HSN Code'] || item?.hsnCode || '',
        unit: unit,
        quantity: returnQty
      };

      if (!returnsByChallan[challanNo]) {
        returnsByChallan[challanNo] = {
          contractorId: contractor._id,
          returnChallanNo: challanNo,
          bookNo: row['Book No.'] || row['BookNo'] || '',
          returnChallanDate: row['Return Challan Date'] ? (parseCsvDate(row['Return Challan Date']) || new Date()) : new Date(),
          contractorFarmName: row['Contractor\'s Firm/Farm Name'] || row['ContractorFirmName'] || contractor.farmName || '',
          supervisorEngineer: row['Supervisor / Engineer'] || '',
          division: row['Name of Division'] || '',
          subDivision: row['Name of Sub-Division'] || '',
          subStation: row['Name of Sub-Station'] || '',
          feeder: row['Name of Feeder'] || '',
          issuedTfsSrNo: row['Return TFS Sr No.'] || '',
          remarks: row['Remarks'] || '',
          status: 'Approved',
          circle: (req as any).user?.assignedCircle || '',
          createdBy: (req as any).user?._id,
          lineItems: []
        };
      }
      
      if (itemName || tempCode) {
        returnsByChallan[challanNo].lineItems.push(lineItem);
      }
    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  // Pass 1: Validate existing returns
  for (const challanNo of Object.keys(returnsByChallan)) {
    const existing = await ContractorReturn.findOne({ returnChallanNo: challanNo });
    if (existing) {
      errors.push(`Return Challan ${challanNo} already exists. Skipping.`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row errors.')
    );
  }

  // Pass 2: Save Data
  const affectedItemIds = new Set<string>();
  
  for (const challanNo of Object.keys(returnsByChallan)) {
    try {
      const payload = returnsByChallan[challanNo];
      await ContractorReturn.create([payload]);
      
      if (payload.lineItems && Array.isArray(payload.lineItems)) {
        payload.lineItems.forEach((li: any) => {
          if (li.itemId) affectedItemIds.add(li.itemId.toString());
        });
      }
      
      successCount++;
    } catch (err: any) {
      console.error(`Error saving Challan ${challanNo}:`, err);
    }
  }

  // Trigger rebuilds for all affected items so global stock balance updates
  for (const id of Array.from(affectedItemIds)) {
    SummaryService.rebuildForItem(id).catch(console.error);
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed')
  );
});

function parseCsvDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  let d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      // Handle DD-MM-YYYY or DD/MM/YYYY
      if (parts[2].length === 4) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
  }
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export const exportContractorAssignments = asyncHandler(async (req: Request, res: Response) => {
  const { contractorId, startDate, endDate, search } = req.query;
  const filter: any = {};
  
  if (contractorId && contractorId !== 'All') {
    filter.contractorId = contractorId;
  }
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }
  
  if (search) {
    const searchRegex = { $regex: search as string, $options: 'i' };
    filter.$or = [
      { assignmentNumber: searchRegex },
      { minNo: searchRegex },
      { demandNo: searchRegex }
    ];
  }
  
  const user = (req as any).user;
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin' || user?.role?.permissions?.includes('*');

  const SUB_STORE_MAP: Record<string, string[]> = {
    'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
    'Nahan': ['Nahan'],
    'Rohru': ['Rohru'],
    'Rampur': ['Rampur'],
  };

  if (user && !isAdmin) {
    if (user.assignedPackage && user.assignedPackage.trim()) {
      const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
      const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      filter.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
    }
    
    if (user.assignedSubcircle) {
      const subcircleRegex = { $regex: new RegExp(`^\\s*${user.assignedSubcircle.trim()}\\s*$`, 'i') };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { subcircle: subcircleRegex }];
        delete filter.$or;
      } else {
        filter.subcircle = subcircleRegex;
      }
    } else if (user.assignedCircle) {
      const allowedCircles = SUB_STORE_MAP[user.assignedCircle] || [user.assignedCircle];
      const regexCircles = allowedCircles.map(c => new RegExp(`^${c}$`, 'i'));
      
      const scopeFilter = {
        $or: [
          { location: { $in: regexCircles } },
          { circle: { $in: regexCircles } }
        ]
      };
      
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, scopeFilter];
        delete filter.$or;
      } else {
        filter.$or = scopeFilter.$or;
      }
    }
  }
  
  const assignments = await ContractorAssignment.find(filter)
    .populate('contractorId', 'name farmName companyName dynamicData')
    .sort({ date: -1 });
    
  const headers = ['MinNo', 'Date', 'ContractorName', 'Circle', 'DemandNo', 'DemandBookNo', 'DemandDate', 'ContractorFarmName', 'SupervisorEngineer', 'Division', 'SubDivision', 'SubStation', 'Feeder', 'VehicleNo', 'MinBookNo', 'MinDate', 'IssuedTfsSrNo', 'Remarks', 'ItemName', 'TempCode', 'LoaSrNo', 'Unit', 'HsnCode', 'DemandQty', 'IssuedQty', 'Rate', 'Amount', 'Activity'];
  
  let csv = headers.join(',') + '\n';
  
  assignments.forEach((assignment: any) => {
    const contractorName = assignment.contractorId?.name || assignment.contractorId?.companyName || assignment.contractorId?.dynamicData?.displayName || assignment.contractorId?.dynamicData?.name || '';
    const dateStr = assignment.date ? new Date(assignment.date).toISOString().split('T')[0] : '';
    const demandDateStr = assignment.demandDate ? new Date(assignment.demandDate).toISOString().split('T')[0] : '';
    const minDateStr = assignment.minDate ? new Date(assignment.minDate).toISOString().split('T')[0] : '';
    
    (assignment.lineItems || []).forEach((item: any) => {
      const row = [
        assignment.assignmentNumber || assignment.minNo || '',
        dateStr,
        contractorName,
        assignment.circle || '',
        assignment.demandNo || '',
        assignment.demandBookNo || '',
        demandDateStr,
        assignment.contractorFarmName || '',
        assignment.supervisorEngineer || '',
        assignment.division || '',
        assignment.subDivision || '',
        assignment.subStation || '',
        assignment.feeder || '',
        assignment.vehicleNo || '',
        assignment.minBookNo || '',
        minDateStr,
        assignment.issuedTfsSrNo || '',
        (assignment.remarks || '').replace(/,/g, ' '),
        (item.itemName || '').replace(/,/g, ' '),
        item.tempCode || '',
        item.loaSrNo || '',
        item.unit || '',
        item.hsnCode || '',
        item.demandQty || 0,
        item.quantity || 0,
        item.rate || 0,
        item.amount || 0,
        item.activity || ''
      ];
      csv += row.map(v => {
        if (v === null || v === undefined) return '';
        const str = String(v);
        if (/[,"\n\r]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',') + '\n';
    });
  });
  
  res.header('Content-Type', 'text/csv');
  res.attachment('contractor_issues.csv');
  res.send(csv);
});

export const importContractorAssignments = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);

  const errors: string[] = [];
  let successCount = 0;
  
  // Get expected circle based on user's assignment
  let expectedCsvCircle = user?.assignedCircle || '';
  if (['kumarhatti', 'nalagarh'].includes(expectedCsvCircle.toLowerCase())) {
    expectedCsvCircle = 'Solan';
  }

  // Also determine what to save for subcircle
  const saveSubcircle = ['kumarhatti', 'nalagarh'].includes((user?.assignedCircle || '').toLowerCase())
    ? user.assignedCircle
    : (user?.assignedSubcircle || '');
  
  // Group rows by MinNo or AssignmentNumber
  const assignmentsByMin: Record<string, any> = {};
  // Caches to prevent massive DB query roundtrips
  const contractorCache = new Map<string, any>();
  const itemCache = new Map<string, any>();
  
  // Pre-fetch all Contractors
  const allContractors = await Contractor.find({}).lean();
  for (const c of allContractors) {
    if (c.name) contractorCache.set(c.name.replace(/\s+/g, '').toLowerCase(), c);
    if (c.dynamicData?.displayName) contractorCache.set(c.dynamicData.displayName.replace(/\s+/g, '').toLowerCase(), c);
    if (c.dynamicData?.companyName) contractorCache.set(c.dynamicData.companyName.replace(/\s+/g, '').toLowerCase(), c);
  }

  // Pre-fetch all Items
  const allItems = await Item.find({}).lean();
  for (const i of allItems) {
    if (!i.dynamicData) continue;
    const tempCode = (i.dynamicData.tempCode || '').toString().trim().toLowerCase();
    const name = (i.dynamicData.name || '').toString().trim().toLowerCase();
    const desc = (i.dynamicData.description || '').toString().trim().toLowerCase();
    const circle = (i.dynamicData.circle || '').toString().trim().toLowerCase();
    
    if (tempCode && circle) itemCache.set(`tc_${tempCode}_${circle}`, i);
    if (name && circle) itemCache.set(`in_${name}_${circle}`, i);
    if (desc && circle) itemCache.set(`in_${desc}_${circle}`, i);
    
    const masterLoaSrNo = (i.dynamicData.sku || i.dynamicData.loaSrNo || i.dynamicData.loaSerialNo || '').toString().trim().toLowerCase();
    if (masterLoaSrNo && circle) itemCache.set(`loa_${masterLoaSrNo}_${circle}`, i);
  }

  for await (const row of parser) {
    try {
      const minNo = row['MinNo'] || row['MIN No'] || row['minNo'] || row['AssignmentNumber'] || '';
      if (!minNo) {
        const isEmpty = Object.values(row).every(v => !v || String(v).trim() === '');
        if (isEmpty) continue;
        errors.push(`Row missing MinNo/AssignmentNumber`);
        continue;
      }

      const contractorName = row['ContractorName'] || row['Contractor'] || '';
      if (!contractorName) {
        errors.push(`Row missing ContractorName for MIN ${minNo}`);
        continue;
      }

      const minDateRaw = row['Date'] || row['MinDate'] || row['MIN Date'] || row['minDate'] || '';
      if (!minDateRaw) {
        errors.push(`Row missing Date for MIN ${minNo}`);
        continue;
      }

      // Find Contractor
      const cleanContractorName = contractorName.trim();
      const contractorKey = cleanContractorName.replace(/\s+/g, '').toLowerCase();
      let contractor = contractorCache.get(contractorKey);

      if (!contractor) {
        errors.push(`Contractor '${contractorName}' not found for MIN ${minNo}`);
        continue;
      }

      const itemName = row['ItemName'] || row['Description of Material'] || '';
      const tempCode = row['TempCode'] || row['Temp Code'] || '';
      const circle = row['Circle'] || row['circle'] || '';
      const activity = row['Activity'] || row['activity'] || '';
      const loaSrNo = row['LoaSrNo'] || row['Loa Sr No'] || row['Loa Sr. No'] || row['LOA Serial No'] || '';
      const unit = row['Unit'] || row['unit'] || '';
      
      if (!itemName && !tempCode) {
        errors.push(`Row missing ItemName/TempCode for MIN ${minNo}`);
        continue;
      }
      if (!circle) {
        errors.push(`Row missing Circle for MIN ${minNo}`);
        continue;
      }

      if (expectedCsvCircle && circle.trim().toLowerCase() !== expectedCsvCircle.toLowerCase()) {
        errors.push(`Invalid Circle for MIN ${minNo}. You can only upload MINs for the '${expectedCsvCircle}' circle.`);
        continue;
      }

      // Find Item
      let item = null;
      const cleanCircle = circle.trim().toLowerCase();
      
      let loaItem = null;
      if (loaSrNo) {
        const cleanLoaSrNo = String(loaSrNo).trim().toLowerCase();
        loaItem = itemCache.get(`loa_${cleanLoaSrNo}_${cleanCircle}`);
      }

      if (loaItem) {
        // LOA exists in this circle, now validate itemName and tempCode match
        const masterItemName = String(loaItem.dynamicData?.name || '').trim().toLowerCase();
        const providedItemName = String(itemName).trim().toLowerCase();
        if (itemName && masterItemName !== providedItemName) {
           errors.push(`Item Name mismatch for LOA Serial No '${loaSrNo}' in MIN ${minNo}. Expected '${loaItem.dynamicData?.name || ''}', found '${itemName}'`);
           continue;
        }

        const masterTempCode = String(loaItem.dynamicData?.tempCode || '').trim().toLowerCase();
        const providedTempCode = String(tempCode).trim().toLowerCase();
        if (tempCode && masterTempCode !== providedTempCode) {
           errors.push(`Temp Code mismatch for LOA Serial No '${loaSrNo}' in MIN ${minNo}. Expected '${loaItem.dynamicData?.tempCode || ''}', found '${tempCode}'`);
           continue;
        }
        
        item = loaItem;
      } else {
        // LOA does not exist or not provided, fallback to standard lookup
        if (tempCode) {
          item = itemCache.get(`tc_${String(tempCode).trim().toLowerCase()}_${cleanCircle}`);
        }
        if (!item && itemName) {
          item = itemCache.get(`in_${String(itemName).trim().toLowerCase()}_${cleanCircle}`);
        }
      }

      if (!item) {
        errors.push(`Item '${loaSrNo || itemName || tempCode}' not found in Item Master list for MIN ${minNo}`);
        continue;
      }

      if (activity && String(item.dynamicData?.activity || '').trim().toLowerCase() !== String(activity).trim().toLowerCase()) {
        errors.push(`Activity mismatch for item '${itemName || tempCode || loaSrNo}' in MIN ${minNo}. Expected '${item.dynamicData?.activity || ''}', found '${activity}'`);
        continue;
      }
      const expectedUnit = String(item.dynamicData?.unit || '').trim().toLowerCase().replace(/\.$/, '');
      const providedUnit = String(unit).trim().toLowerCase().replace(/\.$/, '');
      if (unit && expectedUnit !== providedUnit) {
        errors.push(`Unit mismatch for item '${itemName || tempCode}' in MIN ${minNo}. Expected '${item.dynamicData?.unit || ''}', found '${unit}'`);
        continue;
      }
      if (itemName && String(item.dynamicData?.name || '').trim().toLowerCase() !== String(itemName).trim().toLowerCase()) {
        errors.push(`Item Name mismatch for item '${itemName || tempCode}' in MIN ${minNo}. Expected '${item.dynamicData?.name || ''}', found '${itemName}'`);
        continue;
      }
      if (tempCode && String(item.dynamicData?.tempCode || '').trim().toLowerCase() !== String(tempCode).trim().toLowerCase()) {
        errors.push(`TempCode mismatch for item '${itemName || tempCode}' in MIN ${minNo}. Expected '${item.dynamicData?.tempCode || ''}', found '${tempCode}'`);
        continue;
      }

      const parseNumber = (val: any): number => {
        if (!val) return 0;
        const num = Number(String(val).replace(/,/g, '').trim());
        return isNaN(num) ? 0 : num;
      };

      const demandQty = parseNumber(row['DemandQty'] || row['Demand Qty']);
      const quantity = parseNumber(row['Quantity'] || row['IssuedQty'] || row['Issued Qty']);
      if (quantity < 0) {
        errors.push(`Row has negative IssuedQty for MIN ${minNo}`);
        continue;
      }
      const rate = parseNumber(row['Rate']);
      const amount = row['Amount'] ? parseNumber(row['Amount']) : (quantity * rate);
      const finalUnit = unit || item?.unit || 'Nos';
      const hsnCode = row['HsnCode'] || item?.hsnCode || '';
      const finalActivity = activity || item?.dynamicData?.activity || item?.dynamicData?.Activity || '';
      
      // Auto-populate LOA Serial No from Master item if possible
      const masterLoaSrNo = item?.dynamicData?.sku || item?.dynamicData?.loaSrNo || item?.dynamicData?.loaSerialNo || '';
      const finalLoaSrNo = masterLoaSrNo || loaSrNo || row['LoaSerialNo'] || row['SerialNo'] || row['LoaSerialNumber'] || '';

      const lineItem = {
        itemId: item?._id,
        itemName: itemName || item?.description || 'Unknown Item',
        tempCode: tempCode || item?.itemCode || '',
        unit: finalUnit,
        hsnCode,
        demandQty,
        quantity,
        rate,
        amount,
        activity: finalActivity,
        loaSrNo: finalLoaSrNo
      };

      if (!assignmentsByMin[minNo]) {
        assignmentsByMin[minNo] = {
          contractorId: contractor._id,
          location: circle || 'Store',
          circle: circle || '',
          subcircle: saveSubcircle || '',
          package: user?.assignedPackage || '',
          assignmentNumber: minNo,
          date: parseCsvDate(minDateRaw) || new Date(),
          demandNo: row['DemandNo'] || '',
          demandBookNo: row['DemandBookNo'] || '',
          demandDate: parseCsvDate(row['DemandDate']),
          contractorFarmName: row['ContractorFarmName'] || '',
          supervisorEngineer: row['SupervisorEngineer'] || '',
          division: row['Division'] || '',
          subDivision: row['SubDivision'] || '',
          subStation: row['SubStation'] || '',
          feeder: row['Feeder'] || '',
          vehicleNo: row['VehicleNo'] || '',
          minNo: minNo,
          minBookNo: row['MinBookNo'] || '',
          minDate: parseCsvDate(minDateRaw) || new Date(),
          issuedTfsSrNo: row['IssuedTfsSrNo'] || '',
          remarks: row['Remarks'] || '',
          subTotal: 0,
          total: 0,
          status: 'Sent',
          lineItems: []
        };
      }

      assignmentsByMin[minNo].lineItems.push(lineItem);
      assignmentsByMin[minNo].subTotal += amount;
      assignmentsByMin[minNo].total += amount;

    } catch (err: any) {
      errors.push(`Row error: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row errors. No data was imported.')
    );
  }

  try {
    // Pass 2: Save assignments
    const payloads = Object.values(assignmentsByMin);
    const overwriteExisting = req.body.overwriteExisting === 'true';

    try {
      if (payloads.length > 0) {
        if (overwriteExisting) {
          const bulkOps = payloads.map((payload: any) => ({
            updateOne: {
              filter: { assignmentNumber: payload.assignmentNumber, circle: payload.circle, subcircle: payload.subcircle },
              update: { $set: payload },
              upsert: true
            }
          }));

          const result = await ContractorAssignment.bulkWrite(bulkOps);
          successCount += payloads.length;
        } else {
          // If not overwriting, we filter out existing MINs for this circle/subcircle
          const circles = Array.from(new Set(payloads.map((p: any) => p.circle)));
          const subcircles = Array.from(new Set(payloads.map((p: any) => p.subcircle)));
          const existingMins = await ContractorAssignment.find({
            assignmentNumber: { $in: payloads.map((p: any) => p.assignmentNumber) },
            circle: { $in: circles },
            subcircle: { $in: subcircles }
          }).select('assignmentNumber circle subcircle').lean();
          
          const existingMinSet = new Set(existingMins.map(e => `${e.assignmentNumber}_${e.circle}_${e.subcircle}`));
          
          const validPayloads = [];
          for (const payload of payloads as any[]) {
            if (existingMinSet.has(`${payload.assignmentNumber}_${payload.circle}_${payload.subcircle}`)) {
              errors.push(`Assignment/MIN ${payload.assignmentNumber} already exists in ${payload.circle}. Skipping.`);
            } else {
              validPayloads.push(payload);
            }
          }

          // We do NOT abort the import if there are duplicate errors. We gracefully skip them.

          if (validPayloads.length > 0) {
            await ContractorAssignment.insertMany(validPayloads);
            successCount += validPayloads.length;
          }
        }
      }
    } catch (err: any) {
      errors.push(`Error saving/updating MINs: ${err.message}`);
      return res.status(400).json(
        new ApiResponse(400, { errors }, 'Import failed due to save error. Partial data might have been imported.')
      );
    }

    // Rebuild summary cache for items
    const affectedItemIds = new Set<string>();
    Object.values(assignmentsByMin).forEach((p: any) => {
      (p.lineItems || []).forEach((it: any) => {
        if (it.itemId) affectedItemIds.add(it.itemId.toString());
      });
    });
    affectedItemIds.forEach(id => {
      SummaryService.rebuildForItem(id).catch(console.error);
    });
  } catch (error) {
    throw error;
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed')
  );
});

export const getContractorTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const contractor = await Contractor.findById(id);
  if (!contractor) {
    throw new ApiError(404, 'Contractor not found');
  }

  const [assignments, returns] = await Promise.all([
    ContractorAssignment.find({ contractorId: id })
      .select('_id assignmentNumber minNo date status total lineItems')
      .sort({ date: 1 })
      .lean(),
    ContractorReturn.find({ contractorId: id })
      .select('_id returnNumber mrvNo date status total lineItems')
      .sort({ date: 1 })
      .lean()
  ]);

  res.status(200).json(new ApiResponse(200, {
    assignments,
    returns
  }, 'Contractor transactions fetched successfully'));
});

export const getContractorAggregatedQuantities = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const [jmcRecords, wipRecords, wipReqRecords] = await Promise.all([
    JmcRegister.find({ contractorId: id, status: 'Approved' }).lean(),
    WipRegister.find({ contractorId: id, status: 'Approved' }).lean(),
    WipRequiredRegister.find({ contractorId: id, status: 'Approved' }).lean()
  ]);

  const map: Record<string, { jmcQty: number; wipQty: number; wipRequiredQty: number }> = {};

  const getKey = (activity: string, loaSrNo: string) => {
    return `${(activity || '').trim().toLowerCase()}_${(loaSrNo || '').trim().toLowerCase()}`;
  };

  jmcRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const key = getKey(item.activity, item.loaSerialNo || item.loaSrNo);
      if (!map[key]) map[key] = { jmcQty: 0, wipQty: 0, wipRequiredQty: 0 };
      map[key].jmcQty += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  wipRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const key = getKey(item.activity, item.loaSerialNo || item.loaSrNo);
      if (!map[key]) map[key] = { jmcQty: 0, wipQty: 0, wipRequiredQty: 0 };
      map[key].wipQty += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  wipReqRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const key = getKey(item.activity, item.loaSerialNo || item.loaSrNo);
      if (!map[key]) map[key] = { jmcQty: 0, wipQty: 0, wipRequiredQty: 0 };
      map[key].wipRequiredQty += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  res.status(200).json(
    new ApiResponse(200, map, 'Aggregated quantities fetched successfully')
  );
});
