import { Request, Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { ContractorWorkOrder } from './contractorWorkOrder.schema';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import mongoose from 'mongoose';
import Item from '../items/item.model';
import { Contractor } from './contractor.schema';

// Utility to generate next WO number
const generateNextWoNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `WO-${year}${month}-`;
  
  const lastWo = await ContractorWorkOrder.findOne({ workOrderNumber: new RegExp(`^${prefix}`) })
    .sort({ workOrderNumber: 1 })
    .limit(1);

  let sequence = 1;
  if (lastWo && lastWo.workOrderNumber) {
    const lastSequence = parseInt(lastWo.workOrderNumber.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

export const createWorkOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  
  const workOrderNumber = await generateNextWoNumber();
  
  const payload = {
    ...req.body,
    workOrderNumber,
    createdBy: user._id,
  };

  const workOrder = await ContractorWorkOrder.create(payload);
  res.status(201).json(new ApiResponse(201, workOrder, 'Contractor Work Order created successfully'));
});

export const getWorkOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 50, package: pkg, circle, division, search, status } = req.query;
  const filter: any = {};

  if (pkg) filter.package = pkg;
  if (circle) filter.circle = circle;
  if (division) filter.division = division;
  if (status) {
    if ((status as string).includes(',')) {
      filter.status = { $in: (status as string).split(',') };
    } else {
      filter.status = status;
    }
  }
  if (search) {
    const searchStr = String(search);
    if (/^\d+$/.test(searchStr)) {
      filter.workOrderNumber = searchStr;
    } else {
      filter.workOrderNumber = { $regex: searchStr, $options: 'i' };
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await ContractorWorkOrder.countDocuments(filter);
  
  const workOrders = await ContractorWorkOrder.find(filter)
    .populate('contractorId', 'dynamicData.contractorName dynamicData.companyName dynamicData.displayName')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    data: {
      data: workOrders,
      pagination: {
        totalItems: total,
        currentPage: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    },
    message: 'Work Orders fetched successfully'
  });
});

export const getWorkOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    throw new ApiError(400, 'Invalid Work Order ID');
  }

  const workOrder = await ContractorWorkOrder.findById(id)
    .populate('contractorId', 'dynamicData.contractorName dynamicData.companyName dynamicData.displayName location')
    .populate('createdBy', 'firstName lastName');
    
  if (!workOrder) {
    throw new ApiError(404, 'Work Order not found');
  }

  res.status(200).json(new ApiResponse(200, workOrder, 'Work Order fetched successfully'));
});

export const bulkImportWorkOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user as any;
  const data = req.body.data;

  if (!Array.isArray(data) || data.length === 0) {
    throw new ApiError(400, 'Invalid data format or empty array');
  }

  // Group flat CSV rows by workOrderNumber
  const groupedOrders: Record<string, any[]> = {};
  data.forEach((row: any) => {
    const wo = row.workOrderNumber;
    if (!wo) return;
    if (!groupedOrders[wo]) groupedOrders[wo] = [];
    groupedOrders[wo].push(row);
  });

  const createdWorkOrders = [];
  const errors = [];

  for (const [woNumber, rows] of Object.entries(groupedOrders)) {
    try {
      // Find contractor
      const firstRow = rows[0];
      const contractorName = firstRow.contractorCompanyName || firstRow.contractorName;
      let contractor = await Contractor.findOne({
        $or: [
          { 'dynamicData.contractorName': new RegExp(`^${contractorName}$`, 'i') },
          { 'dynamicData.companyName': new RegExp(`^${contractorName}$`, 'i') },
        ]
      });

      if (!contractor) {
        throw new Error(`Contractor '${contractorName}' not found`);
      }

      // Find items
      const items = [];
      const activitiesSet = new Set<string>();
      let totalWoAmount = 0;

      for (const row of rows) {
        if (!row.itemTempCode && !row.itemActivity) continue; // Skip empty rows

        let item = null;
        if (row.itemTempCode) {
          item = await Item.findOne({ 'dynamicData.tempCode': row.itemTempCode, isDeleted: { $ne: true } });
        } else if (row.itemActivity) {
          item = await Item.findOne({ 'dynamicData.activity': row.itemActivity, isDeleted: { $ne: true } });
        }

        if (!item) {
          throw new Error(`Item not found for temp code: ${row.itemTempCode || row.itemActivity}`);
        }

        const woQty = Number(row.woQty) || 0;
        const rate = Number(row.contractorErectionRate) || 0;
        const computedAmount = woQty * rate;
        const gstType = row.gstType || 'Intra';
        const computedGstAmount = computedAmount * 0.18; // Flat 18%
        
        const amount = row.amount !== undefined && row.amount !== '' ? Number(row.amount) : computedAmount;
        const gstAmount = row.gstAmount !== undefined && row.gstAmount !== '' ? Number(row.gstAmount) : computedGstAmount;
        const totalAmount = row.totalAmount !== undefined && row.totalAmount !== '' ? Number(row.totalAmount) : (amount + gstAmount);

        const activityName = item.dynamicData?.activity || 'Manually Added (Misc)';
        activitiesSet.add(activityName);
        totalWoAmount += totalAmount;

        const circleLower = firstRow.circle?.toLowerCase();
        const computedCircleLoaQty = circleLower === 'solan' ? Number(item.dynamicData?.solanloaqty || item.dynamicData?.solanLoaQuantity || item.dynamicData?.solanLoaQty || 0) :
                     circleLower === 'nahan' ? Number(item.dynamicData?.nahanloaqty || item.dynamicData?.nahanLoaQuantity || item.dynamicData?.nahanLoaQty || 0) :
                     circleLower === 'rampur' ? Number(item.dynamicData?.rampurloaqty || item.dynamicData?.rampurLoaQuantity || item.dynamicData?.rampurLoaQty || 0) :
                     circleLower === 'rohru' ? Number(item.dynamicData?.rohruloaqty || item.dynamicData?.rohruLoaQuantity || item.dynamicData?.rohruLoaQty || 0) : 0;
                     
        const computedCircleBomQty = circleLower === 'solan' ? Number(item.dynamicData?.solanbomqty || item.dynamicData?.solanBomQuantity || item.dynamicData?.solanBomQty || 0) :
                     circleLower === 'nahan' ? Number(item.dynamicData?.nahanbomqty || item.dynamicData?.nahanBomQuantity || item.dynamicData?.nahanBomQty || 0) :
                     circleLower === 'rampur' ? Number(item.dynamicData?.rampurbomqty || item.dynamicData?.rampurBomQuantity || item.dynamicData?.rampurBomQty || 0) :
                     circleLower === 'rohru' ? Number(item.dynamicData?.rohrubomqty || item.dynamicData?.rohruBomQuantity || item.dynamicData?.rohruBomQty || 0) : 0;

        items.push({
          itemId: item._id,
          tempCode: item.dynamicData?.tempCode || '',
          activity: activityName,
          loaSrNo: item.dynamicData?.sku || item.dynamicData?.loaSrNo || '',
          description: item.dynamicData?.description || item.dynamicData?.name || '',
          unit: item.dynamicData?.unit || '',
          circleLoaQty: row.circleLoaQty !== undefined && row.circleLoaQty !== '' ? Number(row.circleLoaQty) : computedCircleLoaQty,
          circleBomQty: row.circleBomQty !== undefined && row.circleBomQty !== '' ? Number(row.circleBomQty) : computedCircleBomQty,
          alreadyIssuedQty: Number(row.alreadyIssuedQty) || 0,
          woQty,
          contractorErectionRate: rate,
          amount,
          gstType,
          gstAmount,
          totalAmount
        });
      }

      const payload = {
        workOrderNumber: woNumber,
        package: firstRow.package,
        circle: firstRow.circle,
        contractorId: contractor._id,
        division: firstRow.division || '',
        subDivision: firstRow.subDivision || '',
        location: firstRow.location || '',
        remarks: firstRow.remarks || '',
        activities: Array.from(activitiesSet),
        items,
        createdBy: user._id,
        status: firstRow.status || 'Draft',
        totalWoAmount
      };

      const workOrder = await ContractorWorkOrder.create(payload);
      createdWorkOrders.push(workOrder);

    } catch (err: any) {
      errors.push({ workOrderNumber: woNumber, message: err.message });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      created: createdWorkOrders.length,
      errors
    },
    message: 'Bulk import processed'
  });
});

export const updateWorkOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid Work Order ID');
  }

  const validStatuses = ['Draft', 'Approved', 'Site Approved', 'Completed'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid status value');
  }

  const workOrder = await ContractorWorkOrder.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!workOrder) {
    throw new ApiError(404, 'Work Order not found');
  }

  res.status(200).json(new ApiResponse(200, workOrder, 'Work Order status updated successfully'));
});

export const updateWorkOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    throw new ApiError(400, 'Invalid Work Order ID');
  }

  const workOrder = await ContractorWorkOrder.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );

  if (!workOrder) {
    throw new ApiError(404, 'Work Order not found');
  }

  res.status(200).json(new ApiResponse(200, workOrder, 'Contractor Work Order updated successfully'));
});

export const deleteWorkOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    throw new ApiError(400, 'Invalid Work Order ID');
  }

  const workOrder = await ContractorWorkOrder.findByIdAndDelete(id);

  if (!workOrder) {
    throw new ApiError(404, 'Work Order not found');
  }

  res.status(200).json(new ApiResponse(200, null, 'Contractor Work Order deleted successfully'));
});
