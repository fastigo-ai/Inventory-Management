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
  const finalPackage = req.body.package || user.assignedPackage;
  const finalCircle = req.body.circle || user.assignedCircle;

  if (!finalPackage || !finalCircle) {
    throw new ApiError(400, 'User or Request must provide a specific Package and Circle.');
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
    package: finalPackage,
    circle: finalCircle,
    ...(locationDrawingUrl && { locationDrawingUrl })
  };

  const demandNote = await DemandNote.create(payload);
  res.status(201).json(new ApiResponse(201, { demandNote }, 'Demand Note created successfully'));
});

// Endpoint to fetch real-time constraints for a specific item in the context of the user's package and circle
export const getContextData = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  const { itemId, contractorId, contractorName, activity, description, tempCode, loaSrNo } = req.query;

  const pkg = user?.assignedPackage || req.query.package;
  const circle = user?.assignedCircle || req.query.circle;

  let item = itemId ? await Item.findById(itemId) : null;
  if (!item && tempCode) {
    item = await Item.findOne({ 'dynamicData.tempCode': String(tempCode).trim(), isDeleted: false });
  }
  if (!item && loaSrNo) {
    item = await Item.findOne({
      $or: [
        { 'dynamicData.sku': String(loaSrNo).trim() },
        { 'dynamicData.loaSerialNo': String(loaSrNo).trim() },
        { 'dynamicData.loaSerialNumber': String(loaSrNo).trim() }
      ],
      isDeleted: false
    });
  }

  // Resolve contractor ID and filter
  let resolvedContractorId = contractorId;
  if (!resolvedContractorId && contractorName) {
    const assignment = await mongoose.model('ContractorAssignment').findOne({
      contractorFarmName: new RegExp(`^${String(contractorName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    }).lean() as any;
    if (assignment && assignment.contractorId) {
      resolvedContractorId = assignment.contractorId.toString();
    }
  }

  const cIdStr = resolvedContractorId ? String(resolvedContractorId).trim() : '';
  const cIdObj = mongoose.Types.ObjectId.isValid(cIdStr) ? new mongoose.Types.ObjectId(cIdStr) : cIdStr;
  const contractorFilter = cIdStr ? { $in: [cIdStr, cIdObj] } : undefined;

  let pkgRegex: RegExp | undefined = undefined;
  if (pkg && pkg !== 'All Packages' && pkg !== 'All' && pkg !== 'all') {
    let flexiblePkg = String(pkg).replace(/\s+/g, ' ').trim();
    flexiblePkg = flexiblePkg.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    flexiblePkg = flexiblePkg.replace(/(\\s|\s)+/g, '\\s*');
    flexiblePkg = flexiblePkg.replace(/\\([()[\]{}|\/?.*+^$])/g, '\\s*\\$1\\s*');
    pkgRegex = new RegExp(`^\\s*${flexiblePkg}\\s*$`, 'i');
  }

  const circleFilter = (circle && circle !== 'All Circles' && circle !== 'All' && circle !== 'all') ? String(circle) : undefined;

  // 1. Fetch ItemSummary for central stock & BOM
  let summary: any = null;
  if (item?._id) {
    const summaryQuery: any = { itemId: item._id };
    if (circleFilter) summaryQuery.circle = circleFilter;
    if (pkgRegex) summaryQuery.package = { $regex: pkgRegex };
    summary = await mongoose.model('ItemSummary').findOne(summaryQuery).lean();
    if (!summary) {
      summary = await mongoose.model('ItemSummary').findOne({ itemId: item._id }).lean();
    }
  }

  // 2. Fetch Work Order for this contractor to get WO Qty, Rate, GST, Circle LOA, BOM Qty
  let woItem: any = null;
  if (contractorFilter) {
    const woQuery: any = { contractorId: contractorFilter };
    if (pkgRegex) woQuery.package = { $regex: pkgRegex };
    if (circleFilter) woQuery.circle = circleFilter;
    const workOrders = await mongoose.model('ContractorWorkOrder').find(woQuery).lean() as any[];

    for (const wo of workOrders) {
      for (const wi of wo.items || []) {
        const matches = (item?._id && wi.itemId && String(wi.itemId) === String(item._id)) ||
                        (tempCode && wi.tempCode && String(wi.tempCode).trim().toLowerCase() === String(tempCode).trim().toLowerCase()) ||
                        (loaSrNo && wi.loaSrNo && String(wi.loaSrNo).trim().toLowerCase() === String(loaSrNo).trim().toLowerCase()) ||
                        (activity && wi.activity && String(wi.activity).trim().toLowerCase() === String(activity).trim().toLowerCase());
        if (matches) {
          woItem = wi;
          break;
        }
      }
      if (woItem) break;
    }
  }

  // 3. Calculate Store Issued Quantity from ContractorAssignment (MIN / Store Issue)
  let storeIssuedQty = 0;
  if (contractorFilter) {
    const assignments = await mongoose.model('ContractorAssignment').find({
      contractorId: contractorFilter,
      status: { $ne: 'Cancelled' }
    }).lean() as any[];

    assignments.forEach(asg => {
      asg.lineItems?.forEach((li: any) => {
        const matches = (item?._id && li.itemId && String(li.itemId) === String(item._id)) ||
                        (tempCode && li.tempCode && String(li.tempCode).trim().toLowerCase() === String(tempCode).trim().toLowerCase()) ||
                        (loaSrNo && li.hsnCode && String(li.hsnCode).trim().toLowerCase() === String(loaSrNo).trim().toLowerCase()) ||
                        (activity && li.activity && String(li.activity).trim().toLowerCase() === String(activity).trim().toLowerCase()) ||
                        (description && li.itemName && String(li.itemName).trim().toLowerCase() === String(description).trim().toLowerCase());
        if (matches) {
          storeIssuedQty += (Number(li.quantity) || 0);
        }
      });
    });
  }

  // Also check past approved demand notes
  let pastDemandQty = 0;
  const dnQuery: any = { status: { $in: ['Approved', 'Fulfilled'] } };
  if (pkgRegex) dnQuery.package = { $regex: pkgRegex };
  if (circleFilter) dnQuery.circle = circleFilter;
  const pastDemandNotes = await DemandNote.find(dnQuery).lean();

  for (const dn of pastDemandNotes) {
    for (const dnItem of dn.items || []) {
      const matches = (item?._id && dnItem.itemId && String(dnItem.itemId) === String(item._id)) ||
                      (tempCode && dnItem.tempCode && String(dnItem.tempCode).trim().toLowerCase() === String(tempCode).trim().toLowerCase());
      if (matches) {
        pastDemandQty += dnItem.demandQty || 0;
      }
    }
  }
  const alreadyIssuedQty = Math.max(storeIssuedQty, pastDemandQty);

  // 4. Calculate Stock Balance in store
  let stockBal = 0;
  if (summary) {
    stockBal = Math.max(0, (summary.actQty || 0) - (summary.billedQty || 0) - (summary.srtQty || 0));
  }
  if (!stockBal && item?.dynamicData) {
    stockBal = Number(item.dynamicData.stockBal || item.dynamicData.stockBalance || item.dynamicData.quantity || 0);
  }

  let transferFromOther = 0;
  let transferToOther = 0;

  // 5. Calculate JMC and WIP Quantities based on contractor, package, circle and item match
  let jmcQty = 0;
  let wipQty = 0;
  let wipRequiredQty = 0;

  if (contractorFilter) {
    const regQuery: any = { contractorId: contractorFilter };
    if (pkgRegex) regQuery.package = { $regex: pkgRegex };
    if (circleFilter) regQuery.circle = circleFilter;

    const jmcRegisters = await mongoose.model('JmcRegister').find(regQuery).lean() as any[];
    jmcRegisters.forEach((jmc: any) => {
      jmc.items?.forEach((jmcItem: any) => {
        const isMatch = (item?._id && jmcItem.itemId && String(jmcItem.itemId) === String(item._id)) ||
                        (tempCode && jmcItem.tempCode && String(jmcItem.tempCode).trim().toLowerCase() === String(tempCode).trim().toLowerCase()) ||
                        (loaSrNo && (jmcItem.loaSerialNo || jmcItem.loaSrNo) && String(jmcItem.loaSerialNo || jmcItem.loaSrNo).trim().toLowerCase() === String(loaSrNo).trim().toLowerCase()) ||
                        (activity && jmcItem.activity && String(jmcItem.activity).trim().toLowerCase() === String(activity).trim().toLowerCase()) ||
                        (description && (jmcItem.description || jmcItem.itemName) && String(jmcItem.description || jmcItem.itemName).trim().toLowerCase() === String(description).trim().toLowerCase());

        if (isMatch) {
          jmcQty += (Number(jmcItem.claimedQty) || 0) + (Number(jmcItem.approvedQty) || 0);
        }
      });
    });

    const wipRegisters = await mongoose.model('WipRegister').find(regQuery).lean() as any[];
    wipRegisters.forEach((wip: any) => {
      wip.items?.forEach((wipItem: any) => {
        const isMatch = (item?._id && wipItem.itemId && String(wipItem.itemId) === String(item._id)) ||
                        (tempCode && wipItem.tempCode && String(wipItem.tempCode).trim().toLowerCase() === String(tempCode).trim().toLowerCase()) ||
                        (loaSrNo && (wipItem.loaSerialNo || wipItem.loaSrNo) && String(wipItem.loaSerialNo || wipItem.loaSrNo).trim().toLowerCase() === String(loaSrNo).trim().toLowerCase()) ||
                        (activity && wipItem.activity && String(wipItem.activity).trim().toLowerCase() === String(activity).trim().toLowerCase()) ||
                        (description && (wipItem.description || wipItem.itemName) && String(wipItem.description || wipItem.itemName).trim().toLowerCase() === String(description).trim().toLowerCase());

        if (isMatch) {
          wipQty += (Number(wipItem.claimedQty) || 0) + (Number(wipItem.approvedQty) || 0);
        }
      });
    });

    const wipRequiredRegisters = await mongoose.model('WipRequiredRegister').find(regQuery).lean() as any[];
    wipRequiredRegisters.forEach((wipReq: any) => {
      wipReq.items?.forEach((wipReqItem: any) => {
        const isMatch = (item?._id && wipReqItem.itemId && String(wipReqItem.itemId) === String(item._id)) ||
                        (tempCode && wipReqItem.tempCode && String(wipReqItem.tempCode).trim().toLowerCase() === String(tempCode).trim().toLowerCase()) ||
                        (loaSrNo && (wipReqItem.loaSerialNo || wipReqItem.loaSrNo) && String(wipReqItem.loaSerialNo || wipReqItem.loaSrNo).trim().toLowerCase() === String(loaSrNo).trim().toLowerCase()) ||
                        (activity && wipReqItem.activity && String(wipReqItem.activity).trim().toLowerCase() === String(activity).trim().toLowerCase()) ||
                        (description && (wipReqItem.description || wipReqItem.itemName) && String(wipReqItem.description || wipReqItem.itemName).trim().toLowerCase() === String(description).trim().toLowerCase());

        if (isMatch) {
          wipRequiredQty += (Number(wipReqItem.claimedQty) || 0) + (Number(wipReqItem.approvedQty) || 0);
        }
      });
    });
  }

  // 6. Compute commercial and master fields
  const circleLoaQty = Number(woItem?.circleLoaQty || summary?.loaQty || item?.dynamicData?.circleLoaQty || item?.dynamicData?.loaQty || 0);
  const totalPackageLoaQty = Number(item?.dynamicData?.totalPackageLoaQty || item?.dynamicData?.totalLoaQty || 0);
  const woQty = Number(woItem?.woQty || 0);
  const bomQty = Number(woItem?.circleBomQty || summary?.bomQty || item?.dynamicData?.circleBomQty || item?.dynamicData?.bomQty || 0);
  const contractorErectionRate = Number(woItem?.contractorErectionRate || item?.dynamicData?.contractorErectionRate || item?.dynamicData?.rate || 0);
  const amount = Number(woItem?.amount || (woQty * contractorErectionRate) || 0);
  const gstType = woItem?.gstType || item?.dynamicData?.gstType || 'Intra';
  const gstAmount = Number(woItem?.gstAmount || (amount * 0.18) || 0);
  const totalAmount = Number(woItem?.totalAmount || (amount + gstAmount) || 0);

  res.status(200).json(new ApiResponse(200, {
    itemDescription: item?.dynamicData?.itemDescription || item?.dynamicData?.description || item?.description || description || '',
    unit: item?.dynamicData?.unit || item?.dynamicData?.uom || woItem?.unit || '',
    circleLoaQty,
    totalPackageLoaQty,
    woQty,
    bomQty,
    contractorErectionRate,
    amount,
    gstType,
    gstAmount,
    totalAmount,
    stockBal,
    alreadyIssuedQty,
    transferFromOther,
    transferToOther,
    jmcQty,
    wipQty,
    wipRequiredQty
  }, 'Context data fetched'));
});

export const getDemandNotes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  const filter: any = {};
  const { status, tab } = req.query as { status?: string; tab?: string };

  const roleName = user.role?.name?.trim();
  // If user is not an admin or PD, restrict to their assigned areas
  if (roleName === 'Site Manager' || roleName === 'Store Manager' || roleName === 'Project Manager') {
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (user.assignedPackage && user.assignedPackage.trim()) {
      filter.package = { $regex: new RegExp(`^${escapeRegex(user.assignedPackage.trim())}$`, 'i') };
    }
    if (user.assignedCircle && user.assignedCircle.trim()) {
      filter.circle = { $regex: new RegExp(`^${escapeRegex(user.assignedCircle.trim())}$`, 'i') };
    }
  }

  // Filter based on explicit status or tab query
  if (status) {
    filter.status = status;
  } else if (tab === 'pending') {
    if (roleName === 'Project Manager') {
      filter.status = { $in: ['Pending PM Approval', 'Pending Approval'] };
    } else if (roleName === 'Project Director') {
      filter.status = 'Pending PD Approval';
    }
  } else if (tab === 'history' || tab === 'approved') {
    if (roleName === 'Project Manager') {
      filter.status = { $in: ['Pending PD Approval', 'Approved', 'Fulfilled', 'Rejected'] };
    } else if (roleName === 'Project Director') {
      filter.status = { $in: ['Approved', 'Fulfilled', 'Rejected'] };
    }
  } else if (tab === 'all') {
    // Return all demand notes within scope
  } else if (roleName === 'Store Manager') {
    filter.status = { $in: ['Approved', 'Fulfilled'] };
  }

  const demandNotes = await DemandNote.find(filter)
    .populate('createdBy', 'firstName lastName email')
    .populate('pmApprovedBy', 'firstName lastName email')
    .populate('pdApprovedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });
    
  res.status(200).json(new ApiResponse(200, { demandNotes }, 'Demand Notes fetched'));
});

export const getDemandNoteById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const demandNote = await DemandNote.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email')
    .populate('pmApprovedBy', 'firstName lastName email')
    .populate('pdApprovedBy', 'firstName lastName email');
    
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
  
  if (user.role?.name === 'Site Manager' && !['Draft', 'Pending Approval', 'Pending PM Approval'].includes(existing.status)) {
    throw new ApiError(403, 'Cannot edit an approved or pending PD demand note.');
  }

  // Prevent changing package/circle by dropping from payload
  const updateData = { ...req.body };
  delete updateData.package;
  delete updateData.circle;
  delete updateData.demandNoteNumber;
  delete updateData.createdBy;

  if (updateData.status === 'Pending PD Approval' && existing.status !== 'Pending PD Approval') {
    updateData.pmApprovedBy = user._id;
    updateData.pmApprovedAt = new Date();
  }
  
  if (updateData.status === 'Approved' && existing.status !== 'Approved') {
    updateData.pdApprovedBy = user._id;
    updateData.pdApprovedAt = new Date();
  }

  const demandNote = await DemandNote.findByIdAndUpdate(req.params.id, updateData, { new: true });
  res.status(200).json(new ApiResponse(200, { demandNote }, 'Demand Note updated successfully'));
});

export const deleteDemandNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await DemandNote.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Demand Note not found');

  if ((existing.status as string) !== 'Draft' && (existing.status as string) !== 'Pending Approval' && (existing.status as string) !== 'Pending PM Approval') {
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
  
  // Pass 1: Validate existing records
  for (const dnNumber of dnNumbers) {
    const dnData = dnMap[dnNumber];
    if (!dnData.package || !dnData.circle) {
      errors.push(`Demand Note ${dnNumber} is missing required Package or Circle.`);
    }
    
    const existing = existingDNs.find(d => d.demandNoteNumber === dnNumber);
    if (existing) {
      errors.push(`Demand Note ${dnNumber} already exists.`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json(
      new ApiResponse(400, { errors }, 'Import failed due to row errors. No data was imported.')
    );
  }

  // Pass 2: Save Data
  for (const dnNumber of dnNumbers) {
    try {
      const dnData = dnMap[dnNumber];
      await DemandNote.create([dnData]);
      successCount++;
    } catch (err: any) {
      console.error(`Failed to import Demand Note ${dnNumber}:`, err);
    }
  }

  res.status(200).json(new ApiResponse(200, { successCount, errors }, 'Import processed'));
});
