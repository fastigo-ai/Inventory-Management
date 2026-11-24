import { Request, Response } from 'express';
import { WipRequiredRegister } from './wipRequired.schema';
import { WipRequiredImportService } from './wipRequiredImport.service';
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

export const createWipRequired = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const user = (req as any).user;

  const count = await WipRequiredRegister.countDocuments();
  data.wipRequiredNumber = `WIP/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
  data.createdBy = user._id;

  let drawingSheetUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'wip_required_drawings');
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

  const payload = {
    ...data,
    items,
    ...(drawingSheetUrl && { drawingSheetUrl })
  };

  const newWipRequired = await WipRequiredRegister.create(payload);

  res.status(201).json(
    new ApiResponse(201, newWipRequired, 'WIP Required register entry created successfully')
  );
});

export const getWipRequireds = asyncHandler(async (req: Request, res: Response) => {
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
    if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate as string);
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

  if (search && search.trim() !== '') {
    filter.wipRequiredNumber = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [total, wips, aggregateResult] = await Promise.all([
    WipRequiredRegister.countDocuments(filter),
    limit > 0 
      ? WipRequiredRegister.find(filter)
          .populate('contractorId', 'name vendorName dynamicData')
          .populate('workOrderId', 'workOrderNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      : WipRequiredRegister.find(filter)
          .populate('contractorId', 'name vendorName dynamicData')
          .populate('workOrderId', 'workOrderNumber')
          .sort({ createdAt: -1 })
          .lean(),
    WipRequiredRegister.aggregate([
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
      data: wips,
      total,
      page,
      limit,
      totalPages,
      aggregates
    }, 'WIP Required register entries fetched successfully')
  );
});

export const getWipRequiredById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const wip = await WipRequiredRegister.findById(id)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber');

  if (!wip) {
    throw new ApiError(404, 'WIP Required register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, wip, 'WIP Required register entry fetched successfully')
  );
});

export const updateWipRequired = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const wip = await WipRequiredRegister.findById(id);
  if (!wip) {
    throw new ApiError(404, 'WIP Required register entry not found');
  }

  let drawingSheetUrl = '';
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'wip_required_drawings');
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

  const payload = {
    ...data,
    ...(items && { items }),
    ...(drawingSheetUrl && { drawingSheetUrl })
  };

  const updatedWipRequired = await WipRequiredRegister.findByIdAndUpdate(
    id,
    payload,
    { returnDocument: 'after', runValidators: true }
  );

  res.status(200).json(
    new ApiResponse(200, updatedWipRequired, 'WIP Required register entry updated successfully')
  );
});

export const deleteWipRequired = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const wip = await WipRequiredRegister.findByIdAndDelete(id);
  
  if (!wip) {
    throw new ApiError(404, 'WIP Required register entry not found');
  }

  res.status(200).json(
    new ApiResponse(200, null, 'WIP Required register entry deleted successfully')
  );
});


export const uploadWipRequiredExcel = asyncHandler(async (req: Request, res: Response) => {
  const clientId = (req.query.clientId as string) || (req.body.clientId as string);
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No files uploaded'));
  }

  const user = (req as any).user;
  const conflictStrategy = req.body.conflictStrategy || 'skip';

  const result = await WipRequiredImportService.processBulkUpload(req.files, user, conflictStrategy, clientId);

  if (!result.success) {
    return res.status(400).json(
      new ApiResponse(
        400,
        { missingItems: result.missingItems },
        `Import rejected: ${result.missingItems?.length || 0} item(s) not found in Master Item List. Nothing was saved.`
      )
    );
  }

  return res.status(200).json(
    new ApiResponse(200, { totalSaved: result.totalSaved, flagged: result.flagged }, `Successfully imported ${result.totalSaved} WIP Required records.`)
  );
});
