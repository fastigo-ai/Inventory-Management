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

  const getOrAddRow = (itemIdStr: string, tempCode: string, activity: string, itemName: string) => {
    // 1. Try to find by itemId and activity (best for JMC/WIP)
    let key = Object.keys(reportMap).find(k => {
      const parts = k.split('_');
      return parts[0] === itemIdStr && parts[2] === (activity || '').trim().toLowerCase() && parts[2] !== '';
    });

    // 2. If not found, try by itemId and tempCode (best for Store Issues/Returns)
    if (!key && tempCode) {
      key = Object.keys(reportMap).find(k => {
        const parts = k.split('_');
        return parts[0] === itemIdStr && parts[1] === tempCode.trim().toLowerCase();
      });
    }

    // 3. If not found, just match by itemId (fallback)
    if (!key) {
      key = Object.keys(reportMap).find(k => k.startsWith(`${itemIdStr}_`));
    }

    if (!key) {
      key = `${itemIdStr}_${(tempCode || '').trim().toLowerCase()}_${(activity || '').trim().toLowerCase()}`;
      reportMap[key] = {
        itemId: itemIdStr,
        tempCode: tempCode || '',
        itemName: itemName || '',
        activity: activity || '',
        jmcDone: 0,
        wipConsumed: 0,
        wipRequired: 0,
        totalIssued: 0,
        totalReturned: 0,
        bomQty: 0
      };
    }
    return key;
  };

  workOrders.forEach(wo => {
    wo.items.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      const key = getOrAddRow(itemIdStr, item.tempCode, item.activity, item.description || (item.itemId as any)?.name || '');
      reportMap[key].bomQty += (item.circleBomQty || 0);
      // Ensure tempCode and activity are populated from baseline
      if (item.tempCode && !reportMap[key].tempCode) reportMap[key].tempCode = item.tempCode;
      if (item.activity && !reportMap[key].activity) reportMap[key].activity = item.activity;
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
      if (!itemIdStr) return;
      const key = getOrAddRow(itemIdStr, item.tempCode, item.activity, item.description);
      reportMap[key].jmcDone += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate WIP Consumed
  wipRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      if (!itemIdStr) return;
      const key = getOrAddRow(itemIdStr, item.tempCode, item.activity, item.description);
      reportMap[key].wipConsumed += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate WIP Required
  wipReqRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      if (!itemIdStr) return;
      const key = getOrAddRow(itemIdStr, item.tempCode, item.activity, item.description);
      reportMap[key].wipRequired += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate Issued from Store
  assignments.forEach(assignment => {
    assignment.lineItems?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      if (!itemIdStr) return;
      const key = getOrAddRow(itemIdStr, item.tempCode, item.activity, item.itemName);
      reportMap[key].totalIssued += (Number(item.quantity) || 0);
    });
  });

  // Aggregate Returned to Store
  returns.forEach(ret => {
    ret.lineItems?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      if (!itemIdStr) return;
      const key = getOrAddRow(itemIdStr, item.tempCode, item.activity, item.itemName);
      reportMap[key].totalReturned += (Number(item.quantity) || 0);
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
