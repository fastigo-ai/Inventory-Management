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

  let contractorFilter: any = undefined;
  if (contractorId && contractorId !== 'ALL' && contractorId !== 'all') {
    const cIdStr = String(contractorId).trim();
    const cIdObj = mongoose.Types.ObjectId.isValid(cIdStr) ? new mongoose.Types.ObjectId(cIdStr) : cIdStr;
    contractorFilter = { $in: [cIdStr, cIdObj] };
  }

  let pkgRegex: RegExp | undefined = undefined;
  if (pkg && pkg !== 'All Packages' && pkg !== 'All' && pkg !== 'all') {
    let flexiblePkg = String(pkg).replace(/\s+/g, ' ').trim();
    flexiblePkg = flexiblePkg.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    flexiblePkg = flexiblePkg.replace(/(\\s|\s)+/g, '\\s*');
    flexiblePkg = flexiblePkg.replace(/\\([()[\]{}|\/?.*+^$])/g, '\\s*\\$1\\s*');
    pkgRegex = new RegExp(`^\\s*${flexiblePkg}\\s*$`, 'i');
  }

  const circleFilter = (circle && circle !== 'All Circles' && circle !== 'All' && circle !== 'all') ? String(circle) : undefined;

  const circleRegex = circleFilter ? new RegExp(`^${circleFilter}$`, 'i') : undefined;

  // Pre-fetch all items to build a mapping of SKU -> Temp Code & Name
  const itemQuery: any = { isDeleted: { $ne: true } };
  if (pkgRegex) itemQuery.$or = [{ 'dynamicData.package': { $regex: pkgRegex } }, { 'dynamicData.package': { $in: ['', null] } }];
  if (circleRegex) itemQuery['dynamicData.circle'] = { $regex: circleRegex };
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
  const woQuery: any = {};
  if (contractorFilter) woQuery.contractorId = contractorFilter;
  if (pkgRegex) woQuery.$or = [{ package: { $regex: pkgRegex } }, { package: { $in: ['', null] } }];
  if (circleRegex) woQuery.circle = { $regex: circleRegex };

  const workOrders = await ContractorWorkOrder.find(woQuery).populate('items.itemId').lean();

  // Build the baseline report from Work Order Items
  const reportMap: Record<string, any> = {};
  // Helper to normalize activity strings for consistent matching
  const normalizeActivity = (act: string) => (act || '').replace(/\s+/g, '').toLowerCase();

  const getOrAddRow = (itemIdStr: string, loaSrNo: string, tempCode: string | number, activity: string, itemName: string) => {
    const cleanLoa = String(loaSrNo || '').trim().toLowerCase();
    const cleanTemp = String(tempCode || '').trim().toLowerCase();

    const actKey = normalizeActivity(activity);
    
    let primaryKey = '';
    if (cleanTemp) {
      primaryKey = `${actKey}_temp_${cleanTemp}`;
    } else if (cleanLoa) {
      primaryKey = `${actKey}_loa_${cleanLoa}`;
    } else {
      primaryKey = itemIdStr;
    }

    let rowObj = reportMap[primaryKey];

    if (!rowObj) {
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
      reportMap[primaryKey] = rowObj;
    }

    return rowObj;
  };

  // Seed reportMap with all items first so Master Item activities take precedence
  allItems.forEach(item => {
    const act = normalizeActivity(item.dynamicData?.activity);
    if (act) {
       const itemIdStr = item._id.toString();
       const sku = String(item.dynamicData?.sku || item.dynamicData?.loaSerialNo || item.dynamicData?.loaSrNo || '');
       const tempCode = String(item.dynamicData?.tempCode || '');
       const itemName = String(item.dynamicData?.name || item.dynamicData?.description || item.name || '');
       getOrAddRow(itemIdStr, sku, tempCode, item.dynamicData?.activity || '', itemName);
    }
  });

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
  const regQuery: any = { status: { $ne: 'Rejected' } };
  if (contractorFilter) regQuery.contractorId = contractorFilter;
  if (pkgRegex) regQuery.$or = [{ package: { $regex: pkgRegex } }, { package: { $in: ['', null] } }];
  if (circleRegex) regQuery.circle = { $regex: circleRegex };

  const assignQuery: any = { status: { $ne: 'Cancelled' } };
  if (contractorFilter) assignQuery.contractorId = contractorFilter;
  if (pkgRegex) assignQuery.$or = [{ package: { $regex: pkgRegex } }, { package: { $in: ['', null] } }];
  if (circleRegex) assignQuery.circle = { $regex: circleRegex };

  const returnQuery: any = { status: { $ne: 'Cancelled' } };
  if (contractorFilter) returnQuery.contractorId = contractorFilter;
  if (pkgRegex) returnQuery.$or = [{ package: { $regex: pkgRegex } }, { package: { $in: ['', null] } }];
  if (circleRegex) returnQuery.circle = { $regex: circleRegex };

  const [jmcRecords, wipRecords, wipReqRecords, assignments, returns] = await Promise.all([
    JmcRegister.find(regQuery).lean(),
    WipRegister.find(regQuery).lean(),
    WipRequiredRegister.find(regQuery).lean(),
    ContractorAssignment.find(assignQuery).lean(),
    ContractorReturn.find(returnQuery).lean()
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

  // Moved to top

  // Calculate final numbers
  const summaryData = Object.values(reportMap).map(row => {
    const totalWip = row.wipConsumed + row.wipRequired;
    const totalIwipJmc = row.wipConsumed + row.jmcDone;
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

  // Sort by tempCode ascending
  summaryData.sort((a, b) => {
    const numA = Number(a.tempCode);
    const numB = Number(b.tempCode);
    const isNumA = !isNaN(numA) && a.tempCode !== '';
    const isNumB = !isNaN(numB) && b.tempCode !== '';

    if (isNumA && isNumB) {
      return numA - numB;
    } else if (isNumA) {
      return -1; // Numbers come before strings
    } else if (isNumB) {
      return 1;
    }
    
    // Fallback to alphabetical sorting if both are strings or empty
    return (a.tempCode || '').localeCompare(b.tempCode || '') || (a.itemName || '').localeCompare(b.itemName || '');
  });

  res.status(200).json(
    new ApiResponse(200, summaryData, 'Site contractor summary fetched successfully')
  );
});
