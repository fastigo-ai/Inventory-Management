import { Request, Response } from 'express';
import { JmcRegister } from './jmc.schema';
import { JmcService } from './jmc.service';
import { JmcImportService } from './jmcImport.service';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { Contractor } from '../contractors/contractor.schema';
import Item from '../items/item.model';
import * as xlsx from 'xlsx';
import stringSimilarity from 'string-similarity';
import mongoose from 'mongoose';
import cloudinary from '../../core/utils/cloudinary';
import { sseService } from '../../core/utils/sse.service';
const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};


export const createJmc = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const user = (req as any).user;

  const currentYearStr = new Date().getFullYear().toString().slice(-2);
  const lastJmc = await JmcRegister.findOne({ jmcNumber: new RegExp(`^JMC/${currentYearStr}/`) }).sort({ jmcNumber: -1 }).select('jmcNumber').lean();
  let count = 0;
  if (lastJmc && lastJmc.jmcNumber) {
    const parts = lastJmc.jmcNumber.split('/');
    if (parts.length === 3) {
      count = parseInt(parts[2], 10) || 0;
    }
  }
  data.jmcNumber = `JMC/${currentYearStr}/${(count + 1).toString().padStart(4, '0')}`;
  data.createdBy = user._id;

  let drawingSheetUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'jmc_drawings');
    drawingSheetUrl = result.secure_url;
  }

  let items = req.body.items;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (err) {
      throw new ApiError(400, "Invalid JSON format for items array.");
    }
  }

  // VALIDATION FIX: Ensure claimedQty does not exceed cumulative MIN issuedQty
  if (data.contractorId && items && items.length > 0) {
    const itemIds = items.map((i: any) => i.itemId).filter(Boolean).map((id: string) => new mongoose.Types.ObjectId(id));
    if (itemIds.length > 0) {
      // 1. Get total MIN issued qty for this contractor and these items
      const minRecords = await mongoose.model('ContractorAssignment').find({
        contractorId: new mongoose.Types.ObjectId(data.contractorId),
        status: { $ne: 'Cancelled' },
        'lineItems.itemId': { $in: itemIds }
      }).lean();

      const issuedMap = new Map<string, number>();
      minRecords.forEach((record: any) => {
        record.lineItems.forEach((li: any) => {
          if (li.itemId) {
             const idStr = li.itemId.toString();
             issuedMap.set(idStr, (issuedMap.get(idStr) || 0) + (li.quantity || 0));
          }
        });
      });

      // 2. Get total JMC claimed qty for this contractor and these items
      const pastJmcs = await JmcRegister.find({
        contractorId: new mongoose.Types.ObjectId(data.contractorId),
        status: { $ne: 'Rejected' },
        'items.itemId': { $in: itemIds }
      }).lean();

      const claimedMap = new Map<string, number>();
      pastJmcs.forEach((jmc: any) => {
        jmc.items.forEach((i: any) => {
          if (i.itemId) {
            const idStr = i.itemId.toString();
            const qty = jmc.status === 'Approved' ? Number(i.approvedQty || 0) : Number(i.claimedQty || 0);
            claimedMap.set(idStr, (claimedMap.get(idStr) || 0) + qty);
          }
        });
      });

      // 3. Validate
      for (const item of items) {
        if (!item.itemId) continue;
        const idStr = item.itemId.toString();
        const issued = issuedMap.get(idStr) || 0;
        const claimed = claimedMap.get(idStr) || 0;
        const newClaim = Number(item.claimedQty || 0);

        if (claimed + newClaim > issued) {
           throw new ApiError(400, `Validation Error for Activity "${item.activity || 'Unknown'}": Cannot claim ${newClaim} units. Contractor has only been issued ${issued} units total, and ${claimed} units were already claimed. Max allowed claim is ${Math.max(0, issued - claimed)}.`);
        }
      }
    }
  }

  const payload = {
    ...data,
    status: data.status === 'Draft' ? 'Draft' : (data.status === 'Approved' ? 'Approved' : 'Submitted'),
    approvalStatus: data.approvalStatus || (data.status === 'Approved' ? 'Approved' : 'Draft'),
    items,
    ...(drawingSheetUrl && { drawingSheetUrl })
  };

  const newJmc = await JmcRegister.create(payload);

  res.status(201).json(
    new ApiResponse(201, newJmc, 'JMC Register entry created successfully')
  );
});

export const getJmcs = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const page = parseInt(req.query.page as string) || 1;
  const limit = req.query.limit === 'all' ? 0 : parseInt(req.query.limit as string) || 30;
  const search = req.query.search as string;
  const filter: any = {};

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.name === 'Super Admin' || user?.role?.permissions?.includes('*');

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = new mongoose.Types.ObjectId(user.contractorId);
  } else if (req.query.contractorId && req.query.contractorId !== 'All') {
    filter.contractorId = new mongoose.Types.ObjectId(req.query.contractorId as string);
  }

  if (!isAdmin && user?.assignedCircle) {
    const SUB_STORE_MAP: Record<string, string[]> = {
      'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
      'Nahan': ['Nahan'],
      'Rohru': ['Rohru'],
      'Rampur': ['Rampur'],
    };
    const allowedCircles = SUB_STORE_MAP[user.assignedCircle] || [user.assignedCircle];
    const regexCircles = allowedCircles.map(c => new RegExp(`^${c}$`, 'i'));
    filter.circle = { $in: regexCircles };
  }

  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) {
      filter.date.$gte = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate as string);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (req.query.location) filter.location = { $regex: new RegExp(req.query.location as string, 'i') };
  if (req.query.feeder) filter.feeder = { $regex: new RegExp(req.query.feeder as string, 'i') };
  if (req.query.division) filter.division = { $regex: new RegExp(req.query.division as string, 'i') };
  if (req.query.subDivision) filter.subDivision = { $regex: new RegExp(req.query.subDivision as string, 'i') };
  if (req.query.subStation) filter.subStation = { $regex: new RegExp(req.query.subStation as string, 'i') };
  if (req.query.drawingNo) filter.drawingNo = { $regex: new RegExp(req.query.drawingNo as string, 'i') };
  if (req.query.approvalStatus && req.query.approvalStatus !== 'All') {
    filter.approvalStatus = req.query.approvalStatus;
  }
  if (req.query.status && req.query.status !== 'All') {
    if (['Pending PM Approval', 'Pending PD Approval', 'Rejected'].includes(req.query.status as string)) {
      filter.approvalStatus = req.query.status;
    } else {
      filter.status = req.query.status;
    }
  }

  if (search && search.trim() !== '') {
    filter.jmcNumber = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [total, jmcs, aggregateResult] = await Promise.all([
    JmcRegister.countDocuments(filter),
    limit > 0 
      ? JmcRegister.find(filter)
          .populate('contractorId', 'name vendorName dynamicData')
          .populate('workOrderId', 'workOrderNumber')
          .populate('pmApprovedBy', 'firstName lastName email')
          .populate('pdApprovedBy', 'firstName lastName email')
          .populate('rejectedBy', 'firstName lastName email')
          .populate('items.itemId')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      : JmcRegister.find(filter)
          .populate('contractorId', 'name vendorName dynamicData')
          .populate('workOrderId', 'workOrderNumber')
          .populate('pmApprovedBy', 'firstName lastName email')
          .populate('pdApprovedBy', 'firstName lastName email')
          .populate('rejectedBy', 'firstName lastName email')
          .populate('items.itemId')
          .sort({ createdAt: -1 })
          .lean(),
    JmcRegister.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalClaimed: { $sum: "$claimedAmount" },
          totalApproved: { $sum: "$approvedAmount" },
        }
      }
    ])
  ]);

  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  const aggregates = aggregateResult.length > 0 ? aggregateResult[0] : { totalClaimed: 0, totalApproved: 0 };

  res.status(200).json(
    new ApiResponse(200, {
      data: jmcs,
      total,
      page,
      limit,
      totalPages,
      aggregates
    }, 'JMC Register entries fetched successfully')
  );
});

export const getJmcById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const jmc = await JmcRegister.findById(id)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber')
    .populate('pmApprovedBy', 'firstName lastName email')
    .populate('pdApprovedBy', 'firstName lastName email')
    .populate('rejectedBy', 'firstName lastName email');

  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, jmc, 'JMC Register entry fetched successfully')
  );
});

export const sendJmcForApproval = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = (req as any).user;
  const result = await JmcService.sendForApproval(id, user);
  res.status(200).json(
    new ApiResponse(200, result, 'JMC submitted for PM and PD approval successfully')
  );
});

export const approveJmc = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = (req as any).user;
  const { remarks } = req.body;
  const result = await JmcService.approveJmc(id, user, remarks);
  res.status(200).json(
    new ApiResponse(200, result, 'JMC approved successfully')
  );
});

export const rejectJmc = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = (req as any).user;
  const { remarks } = req.body;
  const result = await JmcService.rejectJmc(id, user, remarks);
  res.status(200).json(
    new ApiResponse(200, result, 'JMC rejected successfully')
  );
});

export const updateJmc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const jmc = await JmcRegister.findById(id);
  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  let drawingSheetUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'jmc_drawings');
    drawingSheetUrl = result.secure_url;
  }

  let items = req.body.items;
  if (items && typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (err) {
      throw new ApiError(400, "Invalid JSON format for items array.");
    }
  }

  // VALIDATION FIX: Ensure claimedQty does not exceed cumulative MIN issuedQty
  const targetContractorId = data.contractorId || jmc.contractorId;
  if (targetContractorId && items && items.length > 0) {
    const itemIds = items.map((i: any) => i.itemId).filter(Boolean).map((itemId: string) => new mongoose.Types.ObjectId(itemId));
    if (itemIds.length > 0) {
      // 1. Get total MIN issued qty for this contractor and these items
      const minRecords = await mongoose.model('ContractorAssignment').find({
        contractorId: new mongoose.Types.ObjectId(targetContractorId),
        status: { $ne: 'Cancelled' },
        'lineItems.itemId': { $in: itemIds }
      }).lean();

      const issuedMap = new Map<string, number>();
      minRecords.forEach((record: any) => {
        record.lineItems.forEach((li: any) => {
          if (li.itemId) {
             const idStr = li.itemId.toString();
             issuedMap.set(idStr, (issuedMap.get(idStr) || 0) + (li.quantity || 0));
          }
        });
      });

      // 2. Get total JMC claimed qty for this contractor and these items (excluding current JMC)
      const pastJmcs = await JmcRegister.find({
        _id: { $ne: new mongoose.Types.ObjectId(id as string) },
        contractorId: new mongoose.Types.ObjectId(targetContractorId as string),
        status: { $ne: 'Rejected' },
        'items.itemId': { $in: itemIds }
      }).lean();

      const claimedMap = new Map<string, number>();
      pastJmcs.forEach((pastJmc: any) => {
        pastJmc.items.forEach((i: any) => {
          if (i.itemId) {
            const idStr = i.itemId.toString();
            const qty = pastJmc.status === 'Approved' ? Number(i.approvedQty || 0) : Number(i.claimedQty || 0);
            claimedMap.set(idStr, (claimedMap.get(idStr) || 0) + qty);
          }
        });
      });

      // 3. Validate
      for (const item of items) {
        if (!item.itemId) continue;
        const idStr = item.itemId.toString();
        const issued = issuedMap.get(idStr) || 0;
        const claimed = claimedMap.get(idStr) || 0;
        const newClaim = Number(item.claimedQty || 0);

        if (claimed + newClaim > issued) {
           throw new ApiError(400, `Validation Error for Activity "${item.activity || 'Unknown'}": Cannot claim ${newClaim} units. Contractor has only been issued ${issued} units total, and ${claimed} units were already claimed. Max allowed claim is ${Math.max(0, issued - claimed)}.`);
        }
      }
    }
  }

  const payload = {
    ...data,
    ...(items && { items }),
    ...(drawingSheetUrl && { drawingSheetUrl })
  };

  const updatedJmc = await JmcRegister.findByIdAndUpdate(
    id,
    payload,
    { returnDocument: 'after', runValidators: true }
  );

  res.status(200).json(
    new ApiResponse(200, updatedJmc, 'JMC Register entry updated successfully')
  );
});

export const deleteJmc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const jmc = await JmcRegister.findByIdAndDelete(id);
  
  if (!jmc) {
    throw new ApiError(404, 'JMC Register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'JMC Register entry deleted successfully')
  );
});


export const uploadJmcExcel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No files uploaded'));
  }

  const user = (req as any).user;
  const conflictStrategy = req.body.conflictStrategy || 'skip';
  const clientId = (req.query.clientId as string) || (req.body.clientId as string);

  const result = await JmcImportService.processBulkUpload(req.files, user, conflictStrategy, clientId);

  if (!result.success) {
    return res.status(400).json(
      new ApiResponse(
        400,
        { missingItems: result.missingItems },
        `Import rejected: ${result.missingItems?.length || 0} item(s) not found in Master Item List. Nothing was saved.`
      )
    );
  }

  res.status(200).json(
    new ApiResponse(200, { totalSaved: result.totalSaved, flagged: result.flagged }, `Successfully imported ${result.totalSaved} JMC records.`)
  );
});
