import mongoose from 'mongoose';
import Item from '../items/item.model';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import { JmcRegister } from '../jmc/jmc.schema';
import { WipRegister } from '../wip/wip.schema';
import { WipRequiredRegister } from '../wip-required/wipRequired.schema';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { ContractorReturn } from '../contractors/contractorReturn.schema';

interface SiteSummaryParams {
  contractorId?: string;
  package?: string;
  circle?: string;
}

const siteSummaryCache = new Map<string, { timestamp: number; data: any[] | null; promise: Promise<any[]> | null }>();
const SITE_SUMMARY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const clearSiteContractorSummaryCache = () => {
  siteSummaryCache.clear();
};

const normalizeActivity = (act?: string): string => (act || '').replace(/\s+/g, '').toLowerCase();

const getVariants = (val: string): string[] => {
  if (!val) return [];
  const raw = val.trim();
  return Array.from(new Set([
    raw,
    raw.toUpperCase(),
    raw.toLowerCase(),
    raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase(),
    `${raw} `,
    `${raw.toUpperCase()} `
  ]));
};

export async function computeSiteContractorSummary(params: SiteSummaryParams): Promise<any[]> {
  const cacheKey = JSON.stringify(params);
  const cached = siteSummaryCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < SITE_SUMMARY_CACHE_TTL)) {
    if (cached.promise) return await cached.promise;
    if (cached.data) return cached.data;
  }

  let resolvePromise: (data: any[]) => void;
  let rejectPromise: (err: any) => void;
  const dataPromise = new Promise<any[]>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  siteSummaryCache.set(cacheKey, { timestamp: Date.now(), data: null, promise: dataPromise });

  try {
    const data = await computeSiteContractorSummaryInner(params);
    siteSummaryCache.set(cacheKey, { timestamp: Date.now(), data, promise: null });
    resolvePromise!(data);
    return data;
  } catch (error) {
    siteSummaryCache.delete(cacheKey);
    rejectPromise!(error);
    throw error;
  }
}

async function computeSiteContractorSummaryInner(params: SiteSummaryParams): Promise<any[]> {
  const { contractorId, package: pkg, circle } = params;

  // 1. Build Filter Criteria
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

  const circleFilter = (circle && circle !== 'All Circles' && circle !== 'All' && circle !== 'all') ? String(circle).trim() : undefined;
  let circleMatch: any = undefined;
  if (circleFilter) {
    circleMatch = { $in: getVariants(circleFilter) };
  }

  // 2. Query conditions for Item & WorkOrders
  const itemQuery: any = { isDeleted: { $ne: true } };
  if (pkgRegex) itemQuery.$or = [{ 'dynamicData.package': { $regex: pkgRegex } }, { 'dynamicData.package': { $in: ['', null] } }];
  if (circleMatch) itemQuery['dynamicData.circle'] = circleMatch;

  const woQuery: any = {};
  if (contractorFilter) woQuery.contractorId = contractorFilter;
  if (pkgRegex) woQuery.$or = [{ package: { $regex: pkgRegex } }, { package: { $in: ['', null] } }];
  if (circleMatch) woQuery.circle = circleMatch;

  // 3. Match filters for registers & movements
  const regMatch: any = { status: { $ne: 'Rejected' } };
  if (contractorFilter) regMatch.contractorId = contractorFilter;
  if (pkgRegex) regMatch.$or = [{ package: { $regex: pkgRegex } }, { package: { $in: ['', null] } }];
  if (circleMatch) regMatch.circle = circleMatch;

  const movementMatch: any = { status: { $ne: 'Cancelled' } };
  if (contractorFilter) movementMatch.contractorId = contractorFilter;
  if (pkgRegex) movementMatch.$or = [{ package: { $regex: pkgRegex } }, { package: { $in: ['', null] } }];
  if (circleMatch) movementMatch.circle = circleMatch;

  // 4. Parallel execution: DB server-side aggregations for high performance
  const [
    allItems,
    workOrders,
    jmcAgg,
    wipAgg,
    wipReqAgg,
    assignAgg,
    returnAgg
  ] = await Promise.all([
    Item.find(itemQuery)
      .select('_id name dynamicData.circle dynamicData.sku dynamicData.loaSerialNo dynamicData.loaSrNo dynamicData.tempCode dynamicData.name dynamicData.description dynamicData.activity')
      .lean(),

    ContractorWorkOrder.find(woQuery)
      .select('circle items.itemId items.loaSrNo items.tempCode items.activity items.description items.circleBomQty')
      .lean(),

    JmcRegister.aggregate([
      { $match: regMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            circle: { $ifNull: ['$circle', ''] },
            itemId: '$items.itemId',
            loa: { $ifNull: ['$items.loaSerialNo', '$items.loaSrNo'] },
            tempCode: { $ifNull: ['$items.tempCode', ''] },
            activity: { $ifNull: ['$items.activity', ''] },
            description: { $ifNull: ['$items.description', ''] }
          },
          qty: {
            $sum: {
              $toDouble: {
                $ifNull: ['$items.approvedQty', { $ifNull: ['$items.claimedQty', { $ifNull: ['$items.quantity', 0] }] }]
              }
            }
          }
        }
      }
    ]),

    WipRegister.aggregate([
      { $match: regMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            circle: { $ifNull: ['$circle', ''] },
            itemId: '$items.itemId',
            loa: { $ifNull: ['$items.loaSerialNo', '$items.loaSrNo'] },
            tempCode: { $ifNull: ['$items.tempCode', ''] },
            activity: { $ifNull: ['$items.activity', ''] },
            description: { $ifNull: ['$items.description', ''] }
          },
          qty: {
            $sum: {
              $toDouble: {
                $ifNull: ['$items.approvedQty', { $ifNull: ['$items.claimedQty', { $ifNull: ['$items.quantity', 0] }] }]
              }
            }
          }
        }
      }
    ]),

    WipRequiredRegister.aggregate([
      { $match: regMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            circle: { $ifNull: ['$circle', ''] },
            itemId: '$items.itemId',
            loa: { $ifNull: ['$items.loaSerialNo', '$items.loaSrNo'] },
            tempCode: { $ifNull: ['$items.tempCode', ''] },
            activity: { $ifNull: ['$items.activity', ''] },
            description: { $ifNull: ['$items.description', ''] }
          },
          qty: {
            $sum: {
              $toDouble: {
                $ifNull: ['$items.approvedQty', { $ifNull: ['$items.claimedQty', { $ifNull: ['$items.quantity', 0] }] }]
              }
            }
          }
        }
      }
    ]),

    ContractorAssignment.aggregate([
      { $match: movementMatch },
      { $unwind: '$lineItems' },
      {
        $group: {
          _id: {
            circle: { $ifNull: ['$circle', ''] },
            itemId: '$lineItems.itemId',
            loa: { $ifNull: ['$lineItems.loaSrNo', ''] },
            tempCode: { $ifNull: ['$lineItems.tempCode', ''] },
            activity: { $ifNull: ['$lineItems.activity', ''] },
            itemName: { $ifNull: ['$lineItems.itemName', ''] }
          },
          qty: { $sum: { $toDouble: { $ifNull: ['$lineItems.quantity', 0] } } }
        }
      }
    ]),

    ContractorReturn.aggregate([
      { $match: movementMatch },
      { $unwind: '$lineItems' },
      {
        $group: {
          _id: {
            circle: { $ifNull: ['$circle', ''] },
            itemId: '$lineItems.itemId',
            loa: { $ifNull: ['$lineItems.loaSrNo', ''] },
            tempCode: { $ifNull: ['$lineItems.tempCode', ''] },
            activity: { $ifNull: ['$lineItems.activity', ''] },
            itemName: { $ifNull: ['$lineItems.itemName', ''] }
          },
          qty: { $sum: { $toDouble: { $ifNull: ['$lineItems.quantity', 0] } } }
        }
      }
    ])
  ]);

  // 5. SKU & Metadata Lookup Map
  const skuMap: Record<string, { tempCode: string; name: string }> = {};
  allItems.forEach(item => {
    const itemCircle = String(item.dynamicData?.circle || '').trim().toLowerCase();
    const skuVal = String(item.dynamicData?.sku || item.dynamicData?.loaSerialNo || item.dynamicData?.loaSrNo || '').trim().toLowerCase();
    const meta = {
      tempCode: item.dynamicData?.tempCode || '',
      name: item.dynamicData?.name || item.dynamicData?.description || ''
    };
    if (skuVal) {
      skuMap[skuVal] = meta;
      if (itemCircle) {
        skuMap[`${itemCircle}_${skuVal}`] = meta;
      }
    }
    skuMap[item._id.toString()] = meta;
  });

  // 6. Fast In-Memory Accumulator
  const reportMap: Record<string, any> = {};

  const getOrAddRow = (itemIdStr: string, loaSrNo: string, tempCode: string | number, activity: string, itemName: string, rowCircle: string) => {
    const cleanLoa = String(loaSrNo || '').trim().toLowerCase();
    const cleanTemp = String(tempCode || '').trim().toLowerCase();
    const cleanCircle = String(rowCircle || '').trim().toLowerCase();
    const actKey = normalizeActivity(activity);

    let primaryKey = '';
    if (cleanCircle && cleanLoa) {
      primaryKey = `${actKey}_${cleanCircle}_loa_${cleanLoa}`;
    } else if (cleanLoa) {
      primaryKey = `${actKey}_loa_${cleanLoa}`;
    } else if (cleanTemp) {
      primaryKey = `${actKey}_temp_${cleanTemp}`;
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

  // Seed reportMap with Master Item activities
  allItems.forEach(item => {
    const act = normalizeActivity(item.dynamicData?.activity);
    if (act) {
      const itemIdStr = item._id.toString();
      const sku = String(item.dynamicData?.sku || item.dynamicData?.loaSerialNo || item.dynamicData?.loaSrNo || '');
      const tempCode = String(item.dynamicData?.tempCode || '');
      const itemName = String(item.dynamicData?.name || item.dynamicData?.description || item.name || '');
      getOrAddRow(itemIdStr, sku, tempCode, item.dynamicData?.activity || '', itemName, item.dynamicData?.circle || '');
    }
  });

  // Seed Work Order BOM Quantities
  workOrders.forEach(wo => {
    wo.items.forEach((item: any) => {
      const itemIdStr = item.itemId?._id?.toString() || item.itemId?.toString();
      if (!itemIdStr) return;
      const row = getOrAddRow(itemIdStr, item.loaSrNo, item.tempCode, item.activity, item.description || (item.itemId as any)?.name || '', wo.circle || '');
      row.bomQty += (item.circleBomQty || 0);
      if (item.tempCode && !row.tempCode) row.tempCode = item.tempCode;
      if (item.activity && !row.activity) row.activity = item.activity;
    });
  });

  // Aggregate JMC
  jmcAgg.forEach((doc: any) => {
    const g = doc._id;
    const itemIdStr = g.itemId ? g.itemId.toString() : '';
    if (!itemIdStr) return;
    const sku = String(g.loa || '').trim().toLowerCase();
    const cleanCircle = String(g.circle || '').trim().toLowerCase();
    const mapped = skuMap[`${cleanCircle}_${sku}`] || skuMap[sku] || skuMap[itemIdStr];
    const tempCode = g.tempCode || mapped?.tempCode || '';
    const name = g.description || mapped?.name || '';
    const row = getOrAddRow(itemIdStr, String(g.loa || ''), tempCode, g.activity, name, g.circle || '');
    row.jmcDone += (doc.qty || 0);
  });

  // Aggregate WIP Consumed
  wipAgg.forEach((doc: any) => {
    const g = doc._id;
    const itemIdStr = g.itemId ? g.itemId.toString() : '';
    if (!itemIdStr) return;
    const sku = String(g.loa || '').trim().toLowerCase();
    const cleanCircle = String(g.circle || '').trim().toLowerCase();
    const mapped = skuMap[`${cleanCircle}_${sku}`] || skuMap[sku] || skuMap[itemIdStr];
    const tempCode = g.tempCode || mapped?.tempCode || '';
    const name = g.description || mapped?.name || '';
    const row = getOrAddRow(itemIdStr, String(g.loa || ''), tempCode, g.activity, name, g.circle || '');
    row.wipConsumed += (doc.qty || 0);
  });

  // Aggregate WIP Required
  wipReqAgg.forEach((doc: any) => {
    const g = doc._id;
    const itemIdStr = g.itemId ? g.itemId.toString() : '';
    if (!itemIdStr) return;
    const sku = String(g.loa || '').trim().toLowerCase();
    const cleanCircle = String(g.circle || '').trim().toLowerCase();
    const mapped = skuMap[`${cleanCircle}_${sku}`] || skuMap[sku] || skuMap[itemIdStr];
    const tempCode = g.tempCode || mapped?.tempCode || '';
    const name = g.description || mapped?.name || '';
    const row = getOrAddRow(itemIdStr, String(g.loa || ''), tempCode, g.activity, name, g.circle || '');
    row.wipRequired += (doc.qty || 0);
  });

  // Aggregate Issued from Store
  assignAgg.forEach((doc: any) => {
    const g = doc._id;
    const itemIdStr = g.itemId ? g.itemId.toString() : '';
    if (!itemIdStr) return;
    const row = getOrAddRow(itemIdStr, g.loa || '', g.tempCode, g.activity, g.itemName, g.circle || '');
    row.totalIssued += (doc.qty || 0);
  });

  // Aggregate Returned to Store
  returnAgg.forEach((doc: any) => {
    const g = doc._id;
    const itemIdStr = g.itemId ? g.itemId.toString() : '';
    if (!itemIdStr) return;
    const row = getOrAddRow(itemIdStr, g.loa || '', g.tempCode, g.activity, g.itemName, g.circle || '');
    row.totalReturned += (doc.qty || 0);
  });

  // 7. Calculate Final Balance Numbers
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

  // 8. Sort by tempCode ascending, then by name
  summaryData.sort((a, b) => {
    const numA = Number(a.tempCode);
    const numB = Number(b.tempCode);
    const isNumA = !isNaN(numA) && a.tempCode !== '';
    const isNumB = !isNaN(numB) && b.tempCode !== '';

    if (isNumA && isNumB) {
      return numA - numB;
    } else if (isNumA) {
      return -1;
    } else if (isNumB) {
      return 1;
    }

    return (a.tempCode || '').localeCompare(b.tempCode || '') || (a.itemName || '').localeCompare(b.itemName || '');
  });

  return summaryData;
}
