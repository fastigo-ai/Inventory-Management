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

  const cIdStr = String(contractorId).trim();
  const cIdObj = mongoose.Types.ObjectId.isValid(cIdStr) ? new mongoose.Types.ObjectId(cIdStr) : cIdStr;
  const contractorFilter = { $in: [cIdStr, cIdObj] };

  // Create a regex to match package name ignoring spaces and case
  let pkgRegex: RegExp | undefined = undefined;
  if (pkg && pkg !== 'All Packages' && pkg !== 'All' && pkg !== 'all') {
    const escapedPkg = String(pkg).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
    pkgRegex = new RegExp(`^${escapedPkg}$`, 'i');
  }

  const circleFilter = (circle && circle !== 'All Circles' && circle !== 'All' && circle !== 'all') ? String(circle) : undefined;

  // Pre-fetch all items to build a mapping of SKU -> Temp Code & Name
  const itemQuery: any = { isDeleted: false };
  if (pkgRegex) itemQuery['dynamicData.package'] = { $regex: pkgRegex };
  if (circleFilter) itemQuery['dynamicData.circle'] = circleFilter;
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
  const woQuery: any = { contractorId: contractorFilter };
  if (pkgRegex) woQuery.package = { $regex: pkgRegex };
  if (circleFilter) woQuery.circle = circleFilter;

  const workOrders = await ContractorWorkOrder.find(woQuery).populate('items.itemId').lean();

  // Build the baseline report from Work Order Items
  const reportMap: Record<string, any> = {};
  const rowByLoaSrNo = new Map<string, any>();
  const rowByTempCode = new Map<string, any>();
  const rowByActivity = new Map<string, any>();
  const rowByItemId = new Map<string, any>();

  const getOrAddRow = (itemIdStr: string, loaSrNo: string, tempCode: string, activity: string, itemName: string) => {
    const cleanLoa = (loaSrNo || '').trim().toLowerCase();
    const cleanTemp = (tempCode || '').trim().toLowerCase();
    const cleanAct = (activity || '').trim().toLowerCase();

    let rowObj = cleanLoa ? rowByLoaSrNo.get(`${itemIdStr}_${cleanLoa}`) : undefined;

    if (!rowObj && cleanAct) {
      rowObj = rowByActivity.get(`${itemIdStr}_${cleanAct}`);
    }

    if (!rowObj && cleanTemp) {
      rowObj = rowByTempCode.get(`${itemIdStr}_${cleanTemp}`);
    }

    if (!rowObj) {
      rowObj = rowByItemId.get(itemIdStr);
    }

    if (!rowObj) {
      const key = `${itemIdStr}_${cleanLoa}_${cleanTemp}_${cleanAct}`;
      rowObj = {
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
      reportMap[key] = rowObj;

      if (cleanLoa) rowByLoaSrNo.set(`${itemIdStr}_${cleanLoa}`, rowObj);
      if (cleanTemp) rowByTempCode.set(`${itemIdStr}_${cleanTemp}`, rowObj);
      if (cleanAct) rowByActivity.set(`${itemIdStr}_${cleanAct}`, rowObj);
      if (!rowByItemId.has(itemIdStr)) rowByItemId.set(itemIdStr, rowObj);
    }

    return rowObj;
  };

  workOrders.forEach(wo => {
    wo.items.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      if (!itemIdStr) return;
      const row = getOrAddRow(itemIdStr, item.loaSrNo, item.tempCode, item.activity, item.description || (item.itemId as any)?.name || '');
      row.bomQty += (item.circleBomQty || 0);
      if (item.tempCode && !row.tempCode) row.tempCode = item.tempCode;
      if (item.activity && !row.activity) row.activity = item.activity;
    });
  });

  // Query conditions for registers
  const regQuery: any = { contractorId: contractorFilter, status: { $ne: 'Rejected' } };
  if (pkgRegex) regQuery.package = { $regex: pkgRegex };
  if (circleFilter) regQuery.circle = circleFilter;

  const assignQuery: any = { contractorId: contractorFilter, status: { $ne: 'Cancelled' } };

  const [jmcRecords, wipRecords, wipReqRecords, assignments, returns] = await Promise.all([
    JmcRegister.find(regQuery).lean(),
    WipRegister.find(regQuery).lean(),
    WipRequiredRegister.find(regQuery).lean(),
    ContractorAssignment.find(assignQuery).lean(),
    ContractorReturn.find({ contractorId: contractorFilter, status: { $ne: 'Cancelled' } }).lean()
  ]);

  // Aggregate JMC
  jmcRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      if (!itemIdStr) return;
      const sku = String(item.loaSerialNo || item.loaSrNo || '');
      const mapped = skuMap[sku];
      const tempCode = item.tempCode || mapped?.tempCode || '';
      const name = item.description || mapped?.name || '';
      const row = getOrAddRow(itemIdStr, sku, tempCode, item.activity, name);
      row.jmcDone += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate WIP Consumed
  wipRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      if (!itemIdStr) return;
      const sku = String(item.loaSerialNo || item.loaSrNo || '');
      const mapped = skuMap[sku];
      const tempCode = item.tempCode || mapped?.tempCode || '';
      const name = item.description || mapped?.name || '';
      const row = getOrAddRow(itemIdStr, sku, tempCode, item.activity, name);
      row.wipConsumed += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate WIP Required
  wipReqRecords.forEach(record => {
    record.items?.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      if (!itemIdStr) return;
      const sku = String(item.loaSerialNo || item.loaSrNo || '');
      const mapped = skuMap[sku];
      const tempCode = item.tempCode || mapped?.tempCode || '';
      const name = item.description || mapped?.name || '';
      const row = getOrAddRow(itemIdStr, sku, tempCode, item.activity, name);
      row.wipRequired += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  // Aggregate Issued from Store
  assignments.forEach(assignment => {
    assignment.lineItems?.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      if (!itemIdStr) return;
      const row = getOrAddRow(itemIdStr, '', item.tempCode, item.activity, item.itemName);
      row.totalIssued += (Number(item.quantity) || 0);
    });
  });

  // Aggregate Returned to Store
  returns.forEach(ret => {
    ret.lineItems?.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      if (!itemIdStr) return;
      const row = getOrAddRow(itemIdStr, '', item.tempCode, item.activity, item.itemName);
      row.totalReturned += (Number(item.quantity) || 0);
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
  summaryData.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));

  res.status(200).json(
    new ApiResponse(200, summaryData, 'Site contractor summary fetched successfully')
  );
});
