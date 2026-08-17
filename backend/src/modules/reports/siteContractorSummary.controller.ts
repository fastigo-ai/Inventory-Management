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
import Item from '../items/item.model';

export const getSiteContractorSummary = asyncHandler(async (req: Request, res: Response) => {
  const { contractorId, package: pkg, circle } = req.query;

  if (!contractorId) {
    throw new ApiError(400, 'Contractor ID is required');
  }

  // Create a regex to match package name ignoring spaces and case
  let pkgRegex: RegExp | undefined = undefined;
  if (pkg) {
    const escapedPkg = String(pkg).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
    pkgRegex = new RegExp(`^${escapedPkg}$`, 'i');
  }

  // Pre-fetch all items to build a mapping of SKU -> Temp Code & Name
  const itemQuery: any = { isDeleted: false };
  if (pkgRegex) itemQuery['dynamicData.package'] = { $regex: pkgRegex };
  if (circle) itemQuery['dynamicData.circle'] = circle;
  const allItems = await Item.find(itemQuery).lean();
  
  const skuMap: Record<string, { tempCode: string, name: string }> = {};
  allItems.forEach(item => {
    if (item.dynamicData?.sku) {
      skuMap[item.dynamicData.sku] = {
        tempCode: item.dynamicData.tempCode || '',
        name: item.dynamicData.name || item.dynamicData.description || ''
      };
    }
  });

  // Find the relevant work orders to get the baseline items and quantities
  const woQuery: any = { contractorId: new mongoose.Types.ObjectId(contractorId as string) };
  if (pkgRegex) woQuery.package = { $regex: pkgRegex };
  if (circle) woQuery.circle = circle;

  const workOrders = await ContractorWorkOrder.find(woQuery).populate('items.itemId');

  // Build the baseline report from Work Order Items
  const reportMap: Record<string, any> = {};

  const getOrAddRow = (itemIdStr: string, loaSrNo: string, tempCode: string, activity: string, itemName: string) => {
    // 1. Try to find by itemId and loaSrNo (best for JMC/WIP/WIP Req)
    let key = Object.keys(reportMap).find(k => {
      const parts = k.split('_');
      return parts[0] === itemIdStr && parts[1] === (loaSrNo || '').trim().toLowerCase() && parts[1] !== '';
    });

    // 2. Try to find by itemId and activity (fallback for JMC/WIP)
    if (!key && activity) {
      key = Object.keys(reportMap).find(k => {
        const parts = k.split('_');
        return parts[0] === itemIdStr && parts[3] === (activity || '').trim().toLowerCase() && parts[3] !== '';
      });
    }

    // 3. Try to find by itemId and tempCode (best for Store Issues/Returns)
    if (!key && tempCode) {
      key = Object.keys(reportMap).find(k => {
        const parts = k.split('_');
        return parts[0] === itemIdStr && parts[2] === (tempCode || '').trim().toLowerCase() && parts[2] !== '';
      });
    }

    // 4. Just match by itemId
    if (!key) {
      key = Object.keys(reportMap).find(k => k.startsWith(`${itemIdStr}_`));
    }

    if (!key) {
      key = `${itemIdStr}_${(loaSrNo || '').trim().toLowerCase()}_${(tempCode || '').trim().toLowerCase()}_${(activity || '').trim().toLowerCase()}`;
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
      const key = getOrAddRow(itemIdStr, item.loaSrNo, item.tempCode, item.activity, item.description || (item.itemId as any)?.name || '');
      reportMap[key].bomQty += (item.circleBomQty || 0);
      if (item.tempCode && !reportMap[key].tempCode) reportMap[key].tempCode = item.tempCode;
      if (item.activity && !reportMap[key].activity) reportMap[key].activity = item.activity;
    });
  });

  // Query conditions for registers
  const regQuery: any = { contractorId: new mongoose.Types.ObjectId(contractorId as string), status: 'Approved' };
  if (pkgRegex) regQuery.package = { $regex: pkgRegex };
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
      const sku = String(item.loaSerialNo || item.loaSrNo || '');
      const mapped = skuMap[sku];
      const tempCode = item.tempCode || mapped?.tempCode || '';
      const name = item.description || mapped?.name || '';
      const key = getOrAddRow(itemIdStr, sku, tempCode, item.activity, name);
      reportMap[key].jmcDone += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate WIP Consumed
  wipRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      if (!itemIdStr) return;
      const sku = String(item.loaSerialNo || item.loaSrNo || '');
      const mapped = skuMap[sku];
      const tempCode = item.tempCode || mapped?.tempCode || '';
      const name = item.description || mapped?.name || '';
      const key = getOrAddRow(itemIdStr, sku, tempCode, item.activity, name);
      reportMap[key].wipConsumed += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate WIP Required
  wipReqRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      if (!itemIdStr) return;
      const sku = String(item.loaSerialNo || item.loaSrNo || '');
      const mapped = skuMap[sku];
      const tempCode = item.tempCode || mapped?.tempCode || '';
      const name = item.description || mapped?.name || '';
      const key = getOrAddRow(itemIdStr, sku, tempCode, item.activity, name);
      reportMap[key].wipRequired += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate Issued from Store
  assignments.forEach(assignment => {
    assignment.lineItems?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      if (!itemIdStr) return;
      const key = getOrAddRow(itemIdStr, '', item.tempCode, item.activity, item.itemName);
      reportMap[key].totalIssued += (Number(item.quantity) || 0);
    });
  });

  // Aggregate Returned to Store
  returns.forEach(ret => {
    ret.lineItems?.forEach((item: any) => {
      const itemIdStr = item.itemId?.toString();
      if (!itemIdStr) return;
      const key = getOrAddRow(itemIdStr, '', item.tempCode, item.activity, item.itemName);
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
