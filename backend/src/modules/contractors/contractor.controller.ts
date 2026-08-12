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

export const getContractors = asyncHandler(async (req: Request, res: Response) => {
  const { location, search } = req.query;
  const filter: any = { isActive: true };
  
  const conditions = [];

  if (location) {
    conditions.push({
      $or: [
        { location: location },
        { assignedLocations: location },
        { 'dynamicData.circle': location },
        { 'dynamicData.assignedCircle': location },
        { 'dynamicData.assignedCircles': location },
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
  const { contractorId } = req.query;
  const filter: any = {};
  if (contractorId) {
    filter.contractorId = contractorId;
  }
  
  const assignments = await ContractorAssignment.find(filter)
    .populate('contractorId', 'dynamicData.displayName name farmName companyName')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, assignments, 'Assignments fetched successfully'));
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

  const existing = await ContractorAssignment.findOne({ assignmentNumber: assignmentData.assignmentNumber });
  if (existing) {
    throw new ApiError(400, 'Assignment with this number already exists');
  }

  const newAssignment = await ContractorAssignment.create(assignmentData);

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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Contractor.insertMany(validContractors, { session });
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  res.status(200).json(new ApiResponse(200, { successCount: validContractors.length }, 'Import processed successfully'));
});

export const getContractorReturns = asyncHandler(async (req: Request, res: Response) => {
  const returns = await ContractorReturn.find()
    .populate('contractorId', 'dynamicData')
    .sort({ createdAt: -1 });

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

  const newReturn = await ContractorReturn.create(data);

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
  res.status(200).json(new ApiResponse(200, returnObj, 'Contractor return updated successfully'));
});

export const deleteContractorReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const returnObj = await ContractorReturn.findByIdAndDelete(id);
  if (!returnObj) throw new ApiError(404, 'Contractor return not found');
  res.status(200).json(new ApiResponse(200, null, 'Contractor return deleted successfully'));
});

export const bulkImportContractorReturns = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);

  const errors: string[] = [];
  let successCount = 0;
  
  const returnsByChallan: Record<string, any> = {};

  for await (const row of parser) {
    try {
      const challanNo = row['Return Challan No.'] || row['ReturnChallanNo'] || '';
      if (!challanNo) {
        errors.push(`Row missing Return Challan No.`);
        continue;
      }

      const contractorName = row['Contractor Name'] || '';
      let contractor = null;
      if (contractorName) {
        contractor = await Contractor.findOne({ name: { $regex: new RegExp(`^${contractorName}$`, 'i') } });
      }
      if (!contractor) {
        errors.push(`Contractor '${contractorName}' not found for Challan ${challanNo}`);
        continue;
      }

      const itemName = row['Description of Material'] || '';
      const tempCode = row['Temp Code'] || '';
      const returnQty = Number(row['Return QTY.'] || row['ReturnQty'] || 0);

      let item = null;
      if (tempCode) item = await Item.findOne({ itemCode: tempCode });
      if (!item && itemName) item = await Item.findOne({ description: { $regex: new RegExp(`^${itemName}$`, 'i') } });

      const lineItem = {
        itemId: item ? item._id : undefined,
        itemName: item?.description || itemName,
        tempCode: item?.itemCode || tempCode,
        hsnCode: row['HSN Code'] || item?.hsnCode || '',
        unit: row['UNIT'] || row['Unit'] || item?.unit || 'Nos',
        quantity: returnQty
      };

      if (!returnsByChallan[challanNo]) {
        returnsByChallan[challanNo] = {
          contractorId: contractor._id,
          returnChallanNo: challanNo,
          bookNo: row['Book No.'] || row['BookNo'] || '',
          returnChallanDate: row['Return Challan Date'] ? new Date(row['Return Challan Date']) : new Date(),
          contractorFarmName: row['Contractor\'s Firm/Farm Name'] || row['ContractorFirmName'] || contractor.farmName || '',
          supervisorEngineer: row['Supervisor / Engineer'] || '',
          division: row['Name of Division'] || '',
          subDivision: row['Name of Sub-Division'] || '',
          subStation: row['Name of Sub-Station'] || '',
          feeder: row['Name of Feeder'] || '',
          issuedTfsSrNo: row['Return TFS Sr No.'] || '',
          remarks: row['Remarks'] || '',
          status: 'Submitted',
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const challanNo of Object.keys(returnsByChallan)) {
      const payload = returnsByChallan[challanNo];
      
      const existing = await ContractorReturn.findOne({ returnChallanNo: challanNo });
      if (existing) {
        errors.push(`Return Challan ${challanNo} already exists. Skipping.`);
        continue;
      }

      try {
        await ContractorReturn.create([payload], { session });
        successCount++;
      } catch (err: any) {
        errors.push(`Error saving Challan ${challanNo}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json(
        new ApiResponse(400, { errors }, 'Import failed due to row errors.')
      );
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  res.status(200).json(
    new ApiResponse(200, { successCount, errors }, 'Import process completed')
  );
});

export const importContractorAssignments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload a CSV file');
  }

  const parser = parseAndSanitizeCsv(req.file.buffer);

  const errors: string[] = [];
  let successCount = 0;
  
  // Group rows by MinNo or AssignmentNumber
  const assignmentsByMin: Record<string, any> = {};

  for await (const row of parser) {
    try {
      const minNo = row['MinNo'] || row['MIN No'] || row['minNo'] || row['AssignmentNumber'] || '';
      if (!minNo) {
        errors.push(`Row missing MinNo/AssignmentNumber`);
        continue;
      }

      const contractorName = row['ContractorName'] || row['Contractor'] || '';
      if (!contractorName) {
        errors.push(`Row missing ContractorName for MIN ${minNo}`);
        continue;
      }

      // Find Contractor
      const contractor = await Contractor.findOne({ 
        $or: [
          { name: { $regex: new RegExp(`^${contractorName}$`, 'i') } },
          { 'dynamicData.displayName': { $regex: new RegExp(`^${contractorName}$`, 'i') } }
        ]
      });

      if (!contractor) {
        errors.push(`Contractor '${contractorName}' not found for MIN ${minNo}`);
        continue;
      }

      const itemName = row['ItemName'] || row['Description of Material'] || '';
      const tempCode = row['TempCode'] || row['Temp Code'] || '';
      
      if (!itemName && !tempCode) {
        errors.push(`Row missing ItemName/TempCode for MIN ${minNo}`);
        continue;
      }

      // Find Item
      let item = null;
      if (tempCode) {
        item = await Item.findOne({ itemCode: tempCode });
      }
      if (!item && itemName) {
        item = await Item.findOne({ description: { $regex: new RegExp(`^${itemName}$`, 'i') } });
      }

      const demandQty = Number(row['DemandQty'] || row['Demand Qty'] || 0);
      const quantity = Number(row['Quantity'] || row['IssuedQty'] || row['Issued Qty'] || 0);
      if (quantity <= 0) {
        errors.push(`Row has zero IssuedQty for MIN ${minNo}`);
        continue;
      }

      const rate = Number(row['Rate'] || 0);
      const amount = Number(row['Amount'] || (quantity * rate));
      const unit = row['Unit'] || item?.unit || 'Nos';
      const hsnCode = row['HsnCode'] || item?.hsnCode || '';

      const lineItem = {
        itemId: item?._id,
        itemName: itemName || item?.description || 'Unknown Item',
        tempCode: tempCode || item?.itemCode || '',
        unit,
        hsnCode,
        demandQty,
        quantity,
        rate,
        amount
      };

      if (!assignmentsByMin[minNo]) {
        assignmentsByMin[minNo] = {
          contractorId: contractor._id,
          location: 'Store',
          assignmentNumber: minNo,
          date: row['Date'] ? new Date(row['Date']) : new Date(),
          demandNo: row['DemandNo'] || '',
          demandBookNo: row['DemandBookNo'] || '',
          demandDate: row['DemandDate'] ? new Date(row['DemandDate']) : undefined,
          contractorFarmName: row['ContractorFarmName'] || '',
          supervisorEngineer: row['SupervisorEngineer'] || '',
          division: row['Division'] || '',
          subDivision: row['SubDivision'] || '',
          subStation: row['SubStation'] || '',
          feeder: row['Feeder'] || '',
          vehicleNo: row['VehicleNo'] || '',
          minNo: minNo,
          minBookNo: row['MinBookNo'] || '',
          minDate: row['MinDate'] ? new Date(row['MinDate']) : new Date(),
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Save assignments
    for (const minNo of Object.keys(assignmentsByMin)) {
    const payload = assignmentsByMin[minNo];
    
    const existing = await ContractorAssignment.findOne({ assignmentNumber: payload.assignmentNumber });
    if (existing) {
      errors.push(`Assignment/MIN ${payload.assignmentNumber} already exists. Skipping.`);
      continue;
    }

    try {
      await ContractorAssignment.create([payload], { session });
      successCount++;
    } catch (err: any) {
      errors.push(`Error saving MIN ${minNo}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row errors. No data was imported.')
    );
  }

  await session.commitTransaction();
  session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
      .sort({ date: -1 })
      .lean(),
    ContractorReturn.find({ contractorId: id })
      .select('_id returnNumber mrvNo date status total lineItems')
      .sort({ date: -1 })
      .lean()
  ]);

  res.status(200).json(new ApiResponse(200, {
    assignments,
    returns
  }, 'Contractor transactions fetched successfully'));
});
