import mongoose from 'mongoose';
import { ContractorAssignment } from '../../contractors/contractorAssignment.schema';
import { ContractorReturn } from '../../contractors/contractorReturn.schema';
import { JmcRegister } from '../../jmc/jmc.schema';
import { WipRegister } from '../../wip/wip.schema';

interface ReconciliationFilters {
  circle?: string;
  subcircle?: string;
  contractorId?: string;
  tempCode?: string;
  package?: string;
}

interface ContractorItemRow {
  contractorId: string;
  contractorName: string;
  tempCode: string;
  itemName: string;
  unit: string;
  issuedQty: number;
  jmcConsumedQty: number;
  wipConsumedQty: number;
  returnedQty: number;
  balance: number;
  status: 'balanced' | 'holding' | 'over-consumed';
}

interface ReconciliationResult {
  rows: ContractorItemRow[];
  summary: {
    totalContractors: number;
    totalItems: number;
    totalIssued: number;
    totalJmcConsumed: number;
    totalWipConsumed: number;
    totalReturned: number;
    totalBalance: number;
    balancedCount: number;
    holdingCount: number;
    overConsumedCount: number;
  };
}

/**
 * Builds a circle-aware filter for queries.
 * Nalagarh/Kumarhatti are subcircles of Solan, so searching for "Solan" circle
 * should also include those subcircles.
 */
function buildCircleFilter(filters: ReconciliationFilters): any {
  const match: any = {};

  if (filters.subcircle) {
    match.$or = [
      { subcircle: { $regex: new RegExp(`^\\s*${filters.subcircle}\\s*$`, 'i') } },
      { circle: { $regex: new RegExp(`^\\s*${filters.subcircle}\\s*$`, 'i') } },
      { location: { $regex: new RegExp(`^\\s*${filters.subcircle}\\s*$`, 'i') } }
    ];
  } else if (filters.circle) {
    if (filters.circle.toLowerCase() === 'solan') {
      match.$or = [
        { circle: { $regex: /solan|kumarhatti|nalagarh/i } },
        { location: { $regex: /solan|kumarhatti|nalagarh/i } }
      ];
    } else {
      match.$or = [
        { circle: { $regex: new RegExp(filters.circle, 'i') } },
        { location: { $regex: new RegExp(filters.circle, 'i') } }
      ];
    }
  }

  if (filters.contractorId) {
    match.contractorId = new mongoose.Types.ObjectId(filters.contractorId);
  }

  if (filters.package) {
    const normalizedPkg = filters.package.replace(/\s+/g, '');
    const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
    match.package = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
  }

  return match;
}

export async function getContractorStockPosition(filters: ReconciliationFilters): Promise<ReconciliationResult> {
  const circleFilter = buildCircleFilter(filters);
  const tempCodeFilter = filters.tempCode ? { 'lineItems.tempCode': filters.tempCode } : {};

  // --- 1. MINs Issued: Aggregate by (contractorId, tempCode) ---
  const minsPipeline: any[] = [
    { $match: { ...circleFilter, ...tempCodeFilter } },
    { $unwind: '$lineItems' },
    ...(filters.tempCode ? [{ $match: { 'lineItems.tempCode': filters.tempCode } }] : []),
    {
      $group: {
        _id: { contractorId: '$contractorId', tempCode: '$lineItems.tempCode' },
        issuedQty: { $sum: '$lineItems.quantity' },
        itemName: { $first: '$lineItems.itemName' },
        unit: { $first: '$lineItems.unit' }
      }
    },
    {
      $lookup: {
        from: 'contractors',
        localField: '_id.contractorId',
        foreignField: '_id',
        as: 'contractor'
      }
    },
    { $unwind: { path: '$contractor', preserveNullAndEmptyArrays: true } }
  ];

  // --- 2. JMC Consumed: Aggregate by (contractorId, tempCode) ---
  const jmcCircleFilter: any = {};
  if (filters.subcircle) {
    jmcCircleFilter.$or = [
      { circle: { $regex: new RegExp(filters.subcircle, 'i') } },
      { subCircle: { $regex: new RegExp(filters.subcircle, 'i') } }
    ];
  } else if (filters.circle) {
    if (filters.circle.toLowerCase() === 'solan') {
      jmcCircleFilter.$or = [
        { circle: { $regex: /solan|kumarhatti|nalagarh/i } },
        { subCircle: { $regex: /solan|kumarhatti|nalagarh/i } }
      ];
    } else {
      jmcCircleFilter.circle = { $regex: new RegExp(filters.circle, 'i') };
    }
  }
  if (filters.contractorId) {
    jmcCircleFilter.contractorId = new mongoose.Types.ObjectId(filters.contractorId);
  }

  const jmcTempCodeFilter = filters.tempCode ? { 'items.tempCode': filters.tempCode } : {};

  const jmcPipeline: any[] = [
    { $match: { ...jmcCircleFilter, ...jmcTempCodeFilter } },
    { $unwind: '$items' },
    ...(filters.tempCode ? [{ $match: { 'items.tempCode': filters.tempCode } }] : []),
    {
      $group: {
        _id: { contractorId: '$contractorId', tempCode: '$items.tempCode' },
        consumedQty: {
          $sum: {
            $cond: [
              { $gt: [{ $ifNull: ['$items.approvedQty', 0] }, 0] },
              '$items.approvedQty',
              { $ifNull: ['$items.claimedQty', 0] }
            ]
          }
        },
        itemName: { $first: '$items.description' },
        unit: { $first: '$items.unit' }
      }
    },
    {
      $lookup: {
        from: 'contractors',
        localField: '_id.contractorId',
        foreignField: '_id',
        as: 'contractor'
      }
    },
    { $unwind: { path: '$contractor', preserveNullAndEmptyArrays: true } }
  ];

  // --- 3. WIP Consumed: Aggregate by (contractorId, tempCode) ---
  const wipCircleFilter: any = {};
  if (filters.subcircle) {
    wipCircleFilter.$or = [
      { circle: { $regex: new RegExp(filters.subcircle, 'i') } },
      { subCircle: { $regex: new RegExp(filters.subcircle, 'i') } }
    ];
  } else if (filters.circle) {
    if (filters.circle.toLowerCase() === 'solan') {
      wipCircleFilter.$or = [
        { circle: { $regex: /solan|kumarhatti|nalagarh/i } },
        { subCircle: { $regex: /solan|kumarhatti|nalagarh/i } }
      ];
    } else {
      wipCircleFilter.circle = { $regex: new RegExp(filters.circle, 'i') };
    }
  }
  if (filters.contractorId) {
    wipCircleFilter.contractorId = new mongoose.Types.ObjectId(filters.contractorId);
  }

  const wipPipeline: any[] = [
    { $match: wipCircleFilter },
    { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
    ...(filters.tempCode ? [{ $match: { 'items.tempCode': filters.tempCode } }] : []),
    {
      $group: {
        _id: { contractorId: '$contractorId', tempCode: '$items.tempCode' },
        consumedQty: {
          $sum: {
            $cond: [
              { $gt: [{ $ifNull: ['$items.approvedQty', 0] }, 0] },
              '$items.approvedQty',
              { $ifNull: ['$items.claimedQty', { $ifNull: ['$items.consumedQty', 0] }] }
            ]
          }
        },
        itemName: { $first: '$items.description' },
        unit: { $first: '$items.unit' }
      }
    },
    {
      $lookup: {
        from: 'contractors',
        localField: '_id.contractorId',
        foreignField: '_id',
        as: 'contractor'
      }
    },
    { $unwind: { path: '$contractor', preserveNullAndEmptyArrays: true } }
  ];

  // --- 4. Contractor Returns: Aggregate by (contractorId, tempCode) ---
  const returnCircleFilter: any = {};
  if (filters.subcircle) {
    returnCircleFilter.$or = [
      { circle: { $regex: new RegExp(filters.subcircle, 'i') } },
      { location: { $regex: new RegExp(filters.subcircle, 'i') } }
    ];
  } else if (filters.circle) {
    if (filters.circle.toLowerCase() === 'solan') {
      returnCircleFilter.$or = [
        { circle: { $regex: /solan|kumarhatti|nalagarh/i } },
        { location: { $regex: /solan|kumarhatti|nalagarh/i } }
      ];
    } else {
      returnCircleFilter.$or = [
        { circle: { $regex: new RegExp(filters.circle, 'i') } },
        { location: { $regex: new RegExp(filters.circle, 'i') } }
      ];
    }
  }
  if (filters.contractorId) {
    returnCircleFilter.contractorId = new mongoose.Types.ObjectId(filters.contractorId);
  }

  const returnPipeline: any[] = [
    { $match: returnCircleFilter },
    { $unwind: '$lineItems' },
    ...(filters.tempCode ? [{ $match: { 'lineItems.tempCode': filters.tempCode } }] : []),
    {
      $group: {
        _id: { contractorId: '$contractorId', tempCode: '$lineItems.tempCode' },
        returnedQty: { $sum: { $ifNull: ['$lineItems.returnQty', '$lineItems.quantity'] } }
      }
    }
  ];

  // Run all 4 aggregations in parallel
  const [minsResult, jmcResult, wipResult, returnsResult] = await Promise.all([
    ContractorAssignment.aggregate(minsPipeline),
    JmcRegister.aggregate(jmcPipeline),
    WipRegister.aggregate(wipPipeline),
    ContractorReturn.aggregate(returnPipeline)
  ]);

  // Build lookup maps for JMC, WIP, Returns with metadata
  const jmcMap: Record<string, { qty: number; itemName?: string; unit?: string; contractorName?: string }> = {};
  for (const row of jmcResult) {
    const key = `${row._id.contractorId}__${row._id.tempCode}`;
    const cName = row.contractor?.dynamicData?.displayName || row.contractor?.name || row.contractor?.farmName;
    jmcMap[key] = {
      qty: (jmcMap[key]?.qty || 0) + (row.consumedQty || 0),
      itemName: row.itemName,
      unit: row.unit,
      contractorName: cName
    };
  }

  const wipMap: Record<string, { qty: number; itemName?: string; unit?: string; contractorName?: string }> = {};
  for (const row of wipResult) {
    const key = `${row._id.contractorId}__${row._id.tempCode}`;
    const cName = row.contractor?.dynamicData?.displayName || row.contractor?.name || row.contractor?.farmName;
    wipMap[key] = {
      qty: (wipMap[key]?.qty || 0) + (row.consumedQty || 0),
      itemName: row.itemName,
      unit: row.unit,
      contractorName: cName
    };
  }

  const returnMap: Record<string, number> = {};
  for (const row of returnsResult) {
    const key = `${row._id.contractorId}__${row._id.tempCode}`;
    returnMap[key] = (returnMap[key] || 0) + (row.returnedQty || 0);
  }

  // Merge into final rows
  const rows: ContractorItemRow[] = [];
  const contractorSet = new Set<string>();

  for (const min of minsResult) {
    const cid = min._id.contractorId ? min._id.contractorId.toString() : '';
    const tc = min._id.tempCode || '';
    const key = `${cid}__${tc}`;

    const contractorName = min.contractor?.dynamicData?.displayName || min.contractor?.name || min.contractor?.farmName || 'Unknown';
    const issuedQty = min.issuedQty || 0;
    const jmcConsumedQty = jmcMap[key]?.qty || 0;
    const wipConsumedQty = wipMap[key]?.qty || 0;
    const returnedQty = returnMap[key] || 0;
    const balance = Math.round((issuedQty - jmcConsumedQty - wipConsumedQty - returnedQty) * 1000) / 1000;

    let status: 'balanced' | 'holding' | 'over-consumed' = 'holding';
    if (Math.abs(balance) < 0.01) status = 'balanced';
    else if (balance < 0) status = 'over-consumed';

    if (cid) contractorSet.add(cid);
    rows.push({
      contractorId: cid,
      contractorName,
      tempCode: tc,
      itemName: min.itemName || jmcMap[key]?.itemName || wipMap[key]?.itemName || '',
      unit: min.unit || jmcMap[key]?.unit || wipMap[key]?.unit || 'Nos',
      issuedQty,
      jmcConsumedQty,
      wipConsumedQty,
      returnedQty,
      balance,
      status
    });

    // Remove from maps so we can detect unassigned JMC/WIP items
    delete jmcMap[key];
    delete wipMap[key];
    delete returnMap[key];
  }

  // Add JMC-only and WIP-only items (consumed on site but not in MINs)
  const remainingKeys = new Set([...Object.keys(jmcMap), ...Object.keys(wipMap)]);
  for (const key of remainingKeys) {
    const jmcData = jmcMap[key];
    const wipData = wipMap[key];
    const jmcQty = jmcData?.qty || 0;
    const wipQty = wipData?.qty || 0;
    const retQty = returnMap[key] || 0;
    if (jmcQty === 0 && wipQty === 0 && retQty === 0) continue;

    const [cid, tc] = key.split('__');
    if (cid) contractorSet.add(cid);
    const contractorName = jmcData?.contractorName || wipData?.contractorName || 'Unknown';
    const itemName = jmcData?.itemName || wipData?.itemName || '';
    const unit = jmcData?.unit || wipData?.unit || 'Nos';
    const balance = Math.round((0 - jmcQty - wipQty - retQty) * 1000) / 1000;

    rows.push({
      contractorId: cid,
      contractorName,
      tempCode: tc || '',
      itemName,
      unit,
      issuedQty: 0,
      jmcConsumedQty: jmcQty,
      wipConsumedQty: wipQty,
      returnedQty: retQty,
      balance,
      status: balance === 0 ? 'balanced' : 'over-consumed'
    });
  }

  // Sort: group by contractor name, then by tempCode
  rows.sort((a, b) => {
    const nameComp = a.contractorName.localeCompare(b.contractorName);
    if (nameComp !== 0) return nameComp;
    return (parseInt(a.tempCode) || 0) - (parseInt(b.tempCode) || 0);
  });

  // Summary
  let totalIssued = 0, totalJmcConsumed = 0, totalWipConsumed = 0, totalReturned = 0;
  let balancedCount = 0, holdingCount = 0, overConsumedCount = 0;

  for (const row of rows) {
    totalIssued += row.issuedQty;
    totalJmcConsumed += row.jmcConsumedQty;
    totalWipConsumed += row.wipConsumedQty;
    totalReturned += row.returnedQty;
    if (row.status === 'balanced') balancedCount++;
    else if (row.status === 'holding') holdingCount++;
    else overConsumedCount++;
  }

  return {
    rows,
    summary: {
      totalContractors: contractorSet.size,
      totalItems: rows.length,
      totalIssued: Math.round(totalIssued * 1000) / 1000,
      totalJmcConsumed: Math.round(totalJmcConsumed * 1000) / 1000,
      totalWipConsumed: Math.round(totalWipConsumed * 1000) / 1000,
      totalReturned: Math.round(totalReturned * 1000) / 1000,
      totalBalance: Math.round((totalIssued - totalJmcConsumed - totalWipConsumed - totalReturned) * 1000) / 1000,
      balancedCount,
      holdingCount,
      overConsumedCount
    }
  };
}
