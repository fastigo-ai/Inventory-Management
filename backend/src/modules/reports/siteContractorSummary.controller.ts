import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { JmcRegister } from '../jmc/jmc.schema';
import { WipRegister } from '../wip/wip.schema';
import { WipRequiredRegister } from '../wip-required/wipRequired.schema';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { ContractorReturn } from '../contractors/contractorReturn.schema';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import mongoose from 'mongoose';

export const getSiteContractorSummary = asyncHandler(async (req: Request, res: Response) => {
  const { contractorId, package: pkg, circle } = req.query;

  if (!contractorId) {
    throw new ApiError(400, 'Contractor ID is required');
  }

  // Find the relevant work orders to get the baseline items and quantities
  const woQuery: any = { contractorId: new mongoose.Types.ObjectId(contractorId as string) };
  if (pkg) woQuery.package = pkg;
  if (circle) woQuery.circle = circle;

  const workOrders = await ContractorWorkOrder.find(woQuery).populate('items.itemId');

  // Build the baseline report from Work Order Items
  const reportMap: Record<string, any> = {};

  const getKey = (itemId: string, tempCode: string, activity: string) => {
    return `${itemId}_${(tempCode || '').trim().toLowerCase()}_${(activity || '').trim().toLowerCase()}`;
  };

  workOrders.forEach(wo => {
    wo.items.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      const key = getKey(itemIdStr, item.tempCode, item.activity);
      
      if (!reportMap[key]) {
        reportMap[key] = {
          itemId: itemIdStr,
          tempCode: item.tempCode || '',
          itemName: item.description || (item.itemId as any)?.name || '',
          activity: item.activity || '',
          jmcDone: 0,
          wipConsumed: 0,
          wipRequired: 0,
          totalIssued: 0,
          totalReturned: 0,
          bomQty: 0
        };
      }
      reportMap[key].bomQty += (item.circleBomQty || 0);
    });
  });

  // Query conditions for registers
  const regQuery: any = { contractorId: new mongoose.Types.ObjectId(contractorId as string), status: 'Approved' };
  if (pkg) regQuery.package = pkg;
  if (circle) regQuery.circle = circle;

  const [jmcRecords, wipRecords, wipReqRecords, assignments, returns] = await Promise.all([
    JmcRegister.find(regQuery).lean(),
    WipRegister.find(regQuery).lean(),
    WipRequiredRegister.find(regQuery).lean(),
    ContractorAssignment.find({ contractorId: new mongoose.Types.ObjectId(contractorId as string) }).lean(),
    ContractorReturn.find({ contractorId: new mongoose.Types.ObjectId(contractorId as string) }).lean()
  ]);

  // Aggregate JMC
  jmcRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      const key = getKey(itemIdStr, item.tempCode, item.activity);
      if (!reportMap[key]) {
        reportMap[key] = { itemId: itemIdStr, tempCode: item.tempCode || '', itemName: item.description || '', activity: item.activity || '', jmcDone: 0, wipConsumed: 0, wipRequired: 0, totalIssued: 0, totalReturned: 0, bomQty: 0 };
      }
      reportMap[key].jmcDone += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate WIP Consumed
  wipRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      const key = getKey(itemIdStr, item.tempCode, item.activity);
      if (!reportMap[key]) {
        reportMap[key] = { itemId: itemIdStr, tempCode: item.tempCode || '', itemName: item.description || '', activity: item.activity || '', jmcDone: 0, wipConsumed: 0, wipRequired: 0, totalIssued: 0, totalReturned: 0, bomQty: 0 };
      }
      reportMap[key].wipConsumed += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate WIP Required
  wipReqRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      const key = getKey(itemIdStr, item.tempCode, item.activity);
      if (!reportMap[key]) {
        reportMap[key] = { itemId: itemIdStr, tempCode: item.tempCode || '', itemName: item.description || '', activity: item.activity || '', jmcDone: 0, wipConsumed: 0, wipRequired: 0, totalIssued: 0, totalReturned: 0, bomQty: 0 };
      }
      reportMap[key].wipRequired += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate Issued from Store
  assignments.forEach(assignment => {
    assignment.lineItems?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      const key = getKey(itemIdStr, item.tempCode, item.activity);
      if (reportMap[key]) {
        reportMap[key].totalIssued += (Number(item.quantity) || 0);
      } else {
        // If issued item is not in BOM, we might still want to show it.
        // But Store Assignment doesn't have `activity` reliably, so it might not match perfectly.
        // Let's try matching by itemId and tempCode if activity is missing.
        const fallbackKey = Object.keys(reportMap).find(k => k.startsWith(`${itemIdStr}_${(item.tempCode || '').trim().toLowerCase()}`));
        if (fallbackKey) {
          reportMap[fallbackKey].totalIssued += (Number(item.quantity) || 0);
        } else {
          reportMap[key] = { itemId: itemIdStr, tempCode: item.tempCode || '', itemName: item.itemName || '', activity: item.activity || '', jmcDone: 0, wipConsumed: 0, wipRequired: 0, totalIssued: Number(item.quantity) || 0, totalReturned: 0, bomQty: 0 };
        }
      }
    });
  });

  // Aggregate Returned to Store
  returns.forEach(ret => {
    ret.lineItems?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      const key = getKey(itemIdStr, item.tempCode, item.activity); // Returns don't usually have activity
      if (reportMap[key]) {
        reportMap[key].totalReturned += (Number(item.quantity) || 0);
      } else {
        const fallbackKey = Object.keys(reportMap).find(k => k.startsWith(`${itemIdStr}_${(item.tempCode || '').trim().toLowerCase()}`));
        if (fallbackKey) {
          reportMap[fallbackKey].totalReturned += (Number(item.quantity) || 0);
        } else {
          reportMap[key] = { itemId: itemIdStr, tempCode: item.tempCode || '', itemName: item.itemName || '', activity: item.activity || '', jmcDone: 0, wipConsumed: 0, wipRequired: 0, totalIssued: 0, totalReturned: Number(item.quantity) || 0, bomQty: 0 };
        }
      }
    });
  });

  // Calculate final numbers
  const summaryData = Object.values(reportMap).map(row => {
    const totalWip = row.wipConsumed + row.wipRequired;
    const totalIwipJmc = totalWip + row.jmcDone;
    const todayTotalBalance = row.totalIssued - row.totalReturned;
    const finalBalQty = todayTotalBalance - totalIwipJmc;

    return {
      ...row,
      totalWip,
      totalIwipJmc,
      todayTotalBalance,
      finalBalQty
    };
  });

  // Sort by itemName or tempCode
  summaryData.sort((a, b) => a.itemName.localeCompare(b.itemName));

  res.status(200).json(
    new ApiResponse(200, summaryData, 'Site contractor summary fetched successfully')
  );
});
