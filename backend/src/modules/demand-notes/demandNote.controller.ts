import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import DemandNote from './demandNote.schema';
import Item from '../items/item.model';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import cloudinary from '../../core/utils/cloudinary';
import { stringify } from 'csv-stringify/sync';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import mongoose from 'mongoose';

const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folder },
      (error: any, result: any) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    uploadStream.end(buffer);
  });
};
// Utility to generate next demand note number
const generateNextDemandNoteNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `DN-${year}${month}-`;
  
  const lastNote = await DemandNote.findOne({ demandNoteNumber: new RegExp(`^${prefix}`) })
    .sort({ demandNoteNumber: -1 })
    .limit(1);

  let sequence = 1;
  if (lastNote && lastNote.demandNoteNumber) {
    const lastSequence = parseInt(lastNote.demandNoteNumber.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

export const createDemandNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  if (!user.assignedPackage || !user.assignedCircle) {
    throw new ApiError(400, 'User is not assigned to a specific Package and Circle.');
  }

  const demandNoteNumber = await generateNextDemandNoteNumber();
  let locationDrawingUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'demand_notes_drawings');
    locationDrawingUrl = result.secure_url;
  }

  // Parse items since they might be sent as a stringified JSON if FormData is used
  let items = req.body.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (err) {
      items = [];
    }
  }

  const payload = {
    ...req.body,
    items,
    demandNoteNumber,
    createdBy: user._id,
    package: user.assignedPackage,
    circle: user.assignedCircle,
    ...(locationDrawingUrl && { locationDrawingUrl })
  };

  const demandNote = await DemandNote.create(payload);
  res.status(201).json(new ApiResponse(201, { demandNote }, 'Demand Note created successfully'));
});

// Endpoint to fetch real-time constraints for a specific item in the context of the user's package and circle
export const getContextData = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  const { itemId } = req.query;

  if (!user.assignedPackage || !user.assignedCircle) {
    throw new ApiError(400, 'User is not assigned to a specific Package and Circle.');
  }
  if (!itemId) {
    throw new ApiError(400, 'Item ID is required.');
  }

  // Fetch the item
  const item = await Item.findById(itemId);
  if (!item) {
    throw new ApiError(404, 'Item not found');
  }

  // Calculate "Already Issued Qty" from past approved demand notes for this package and circle
  const pastDemandNotes = await DemandNote.find({
    package: user.assignedPackage,
    circle: user.assignedCircle,
    status: { $in: ['Approved', 'Fulfilled'] }
  });

  let alreadyIssuedQty = 0;
  for (const dn of pastDemandNotes) {
    for (const dnItem of dn.items) {
      if (dnItem.itemId?.toString() === itemId.toString()) {
        alreadyIssuedQty += dnItem.demandQty || 0;
      }
    }
  }

  // Example: Transfer from / Transfer to could be derived here by querying MINs or other Store Outward logs.
  // For now, keeping placeholders as discussed with user.
  let transferFromOther = 0;
  let transferToOther = 0;

  res.status(200).json(new ApiResponse(200, {
    itemDescription: item.description,
    bomQty: item.bomQty || 0, // Fallback, normally BOM might be item-specific or project-specific
    stockBal: item.stockBalance || 0, // Assuming central stock balance
    alreadyIssuedQty,
    transferFromOther,
    transferToOther
  }, 'Context data fetched'));
});

export const getDemandNotes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  const filter: any = {};

  // If user is not an admin, restrict to their package and circle
  if (user.role?.name === 'Site Manager') {
    filter.package = user.assignedPackage;
    filter.circle = user.assignedCircle;
  }

  const demandNotes = await DemandNote.find(filter)
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
    
  res.status(200).json(new ApiResponse(200, { demandNotes }, 'Demand Notes fetched'));
});

export const getDemandNoteById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const demandNote = await DemandNote.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email');
    
  if (!demandNote) {
    throw new ApiError(404, 'Demand Note not found');
  }
  res.status(200).json(new ApiResponse(200, { demandNote }, 'Demand Note fetched'));
});

export const updateDemandNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  
  // Site managers can only edit if Draft or Pending Approval
  const existing = await DemandNote.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Demand Note not found');
  
  if (user.role?.name === 'Site Manager' && !['Draft', 'Pending Approval'].includes(existing.status)) {
    throw new ApiError(403, 'Cannot edit an approved or fulfilled demand note.');
  }

  // Prevent changing package/circle by dropping from payload
  const updateData = { ...req.body };
  delete updateData.package;
  delete updateData.circle;
  delete updateData.demandNoteNumber;
  delete updateData.createdBy;

  const demandNote = await DemandNote.findByIdAndUpdate(req.params.id, updateData, { new: true });
  res.status(200).json(new ApiResponse(200, { demandNote }, 'Demand Note updated successfully'));
});

export const deleteDemandNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await DemandNote.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Demand Note not found');

  if (existing.status !== 'Draft' && existing.status !== 'Pending Approval') {
    throw new ApiError(403, 'Only Draft or Pending Demand Notes can be deleted.');
  }

  await existing.deleteOne();
  res.status(200).json(new ApiResponse(200, {}, 'Demand Note deleted successfully'));
});

export const downloadSampleCSV = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sampleData = [{
    DemandNoteNumber: 'DN-00001',
    Package: 'Package A',
    Circle: 'Circle X',
    ContractorName: 'ABC Construction',
    Division: 'Div 1',
    SubDivision: 'SubDiv A',
    Location: 'Site 1',
    Remarks: 'Sample import',
    Status: 'Draft',
    ItemName: 'Sample Item',
    ItemDescription: 'A sample item description',
    Activity: 'Erection',
    TempCode: 'TC-123',
    LoaSrNo: 'LOA-1',
    Unit: 'Nos',
    TotalPackageLoaQty: 100,
    CircleLoaQty: 50,
    CircleBomQty: 40,
    LoaQty: 10,
    WoQty: 10,
    BomQty: 10,
    AlreadyIssuedQty: 0,
    ContractorErectionRate: 15.5,
    Amount: 155,
    GSTType: 'Intra State',
    GSTAmount: 18,
    TotalAmount: 173,
    TransferFromOther: 0,
    TransferToOther: 0,
    StockBal: 100,
    JmcQty: 0,
    WipQty: 0,
    WipRequiredQty: 0,
    MiscellaneousQty: 0,
    DemandQty: 5,
    BalBomQty: 5
  }];

  const csvString = stringify(sampleData, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=demand_note_sample.csv');
  res.status(200).send(csvString);
});

export const importDemandNotes = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new ApiError(400, 'No CSV file uploaded');
  const user = req.user as any;
  const parser = parseAndSanitizeCsv(req.file.buffer);

  const rows: any[] = [];
  const tempCodes = new Set<string>();
  const loaSerialNos = new Set<string>();
  const itemNames = new Set<string>();

  for await (const r of parser) {
    const row = r as any;
    const nRow: any = {};
    for (const key of Object.keys(row)) {
      nRow[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key];
    }
    rows.push(nRow);
    
    if (nRow['tempcode']) tempCodes.add(nRow['tempcode']);
    if (nRow['loasrno']) loaSerialNos.add(nRow['loasrno']);
    if (nRow['loaserialno']) loaSerialNos.add(nRow['loaserialno']);
    if (nRow['serialno']) loaSerialNos.add(nRow['serialno']);
    if (nRow['itemname']) itemNames.add(nRow['itemname']);
  }

  const orConditions: any[] = [];
  if (tempCodes.size > 0) orConditions.push({ 'dynamicData.tempCode': { $in: Array.from(tempCodes) } });
  if (loaSerialNos.size > 0) {
    const serials = Array.from(loaSerialNos);
    orConditions.push({ 'dynamicData.loaSerialNo': { $in: serials } });
    orConditions.push({ 'dynamicData.loaSerialNumber': { $in: serials } });
    orConditions.push({ 'dynamicData.sku': { $in: serials } });
  }
  if (itemNames.size > 0) orConditions.push({ 'dynamicData.name': { $in: Array.from(itemNames) } });

  const existingItems = orConditions.length > 0 ? await Item.find({ $or: orConditions }) : [];
  
  const findItemInMemory = (tCode?: string, lSerial?: string, name?: string) => {
    if (tCode) {
      const found = existingItems.find((i: any) => i.dynamicData?.tempCode === tCode);
      if (found) return found;
    }
    if (lSerial) {
      const found = existingItems.find((i: any) => 
        i.dynamicData?.loaSerialNo === lSerial || 
        i.dynamicData?.loaSerialNumber === lSerial || 
        i.dynamicData?.sku === lSerial
      );
      if (found) return found;
    }
    if (name) {
      const found = existingItems.find((i: any) => i.dynamicData?.name === name);
      if (found) return found;
    }
    return null;
  };

  const dnMap: Record<string, any> = {};

  for (const row of rows) {
    const dnNumber = row['demandnotenumber'];
    if (!dnNumber) continue;

    if (!dnMap[dnNumber]) {
      dnMap[dnNumber] = {
        demandNoteNumber: dnNumber,
        createdBy: user._id,
        package: row['package'] || '',
        circle: row['circle'] || '',
        contractorName: row['contractorname'] || '',
        division: row['division'] || '',
        subDivision: row['subdivision'] || '',
        location: row['location'] || '',
        remarks: row['remarks'] || '',
        status: row['status'] || 'Draft',
        items: []
      };
    }

    const itemName = row['itemname'];
    const tempCode = row['tempcode'] || '';
    const loaSrNo = row['loasrno'] || row['loaserialno'] || row['serialno'] || '';

    if (itemName) {
      const item = findItemInMemory(tempCode, loaSrNo, itemName);
      const itemId = item ? item._id : undefined;

      dnMap[dnNumber].items.push({
        itemId,
        itemName,
        itemDescription: row['itemdescription'] || row['description'] || '',
        activity: row['activity'] || '',
        tempCode,
        loaSrNo,
        unit: row['unit'] || '',
        totalPackageLoaQty: Number(row['totalpackageloaqty'] || 0),
        circleLoaQty: Number(row['circleloaqty'] || 0),
        circleBomQty: Number(row['circlebomqty'] || 0),
        loaQty: Number(row['loaqty'] || 0),
        woQty: Number(row['woqty'] || 0),
        bomQty: Number(row['bomqty'] || 0),
        alreadyIssuedQty: Number(row['alreadyissuedqty'] || 0),
        contractorErectionRate: Number(row['contractorerectionrate'] || 0),
        amount: Number(row['amount'] || 0),
        gstType: row['gsttype'] || '',
        gstAmount: Number(row['gstamount'] || 0),
        totalAmount: Number(row['totalamount'] || 0),
        transferFromOther: Number(row['transferfromother'] || 0),
        transferToOther: Number(row['transfertoother'] || 0),
        stockBal: Number(row['stockbal'] || 0),
        jmcQty: Number(row['jmcqty'] || 0),
        wipQty: Number(row['wipqty'] || 0),
        wipRequiredQty: Number(row['wiprequiredqty'] || 0),
        miscellaneousQty: Number(row['miscellaneousqty'] || 0),
        demandQty: Number(row['demandqty'] || 0),
        balBomQty: Number(row['balbomqty'] || 0)
      });
    }
  }

  const dnNumbers = Object.keys(dnMap);
  const existingDNs = await DemandNote.find({ demandNoteNumber: { $in: dnNumbers } });

  let successCount = 0;
  const errors: any[] = [];
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
  for (const dnNumber of dnNumbers) {
    const dnData = dnMap[dnNumber];
    try {
      if (!dnData.package || !dnData.circle) {
        errors.push(`Demand Note ${dnNumber} is missing required Package or Circle.`);
        continue;
      }
      
      const existing = existingDNs.find(d => d.demandNoteNumber === dnNumber);
      if (existing) {
        errors.push(`Demand Note ${dnNumber} already exists.`);
        continue;
      }
      await DemandNote.create([dnData], { session });
      successCount++;
    } catch (err: any) {
      errors.push(`Failed to import Demand Note ${dnNumber}: ${err.message}`);
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

  res.status(200).json(new ApiResponse(200, { successCount, errors }, 'Import processed'));
});
