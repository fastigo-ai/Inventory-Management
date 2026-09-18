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
    match.$or = [
      { circle: { $regex: new RegExp(filters.circle, 'i') } },
      { location: { $regex: new RegExp(filters.circle, 'i') } }
    ];
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
    jmcCircleFilter.circle = { $regex: new RegExp(filters.circle, 'i') };
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
        consumedQty: { $sum: '$items.claimedQty' }
      }
    }
  ];

  // --- 3. WIP Consumed: Aggregate by (contractorId, tempCode) ---
  const wipCircleFilter: any = {};
  if (filters.subcircle) {
    wipCircleFilter.$or = [
      { circle: { $regex: new RegExp(filters.subcircle, 'i') } }
    ];
  } else if (filters.circle) {
    wipCircleFilter.circle = { $regex: new RegExp(filters.circle, 'i') };
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
        consumedQty: { $sum: { $ifNull: ['$items.consumedQty', { $ifNull: ['$items.approvedQty', '$items.claimedQty'] }] } }
      }
    }
  ];

  // --- 4. Contractor Returns: Aggregate by (contractorId, tempCode) ---
  const returnCircleFilter: any = {};
  if (filters.subcircle) {
    returnCircleFilter.$or = [
      { circle: { $regex: new RegExp(filters.subcircle, 'i') } },
      { location: { $regex: new RegExp(filters.subcircle, 'i') } }
    ];
  } else if (filters.circle) {
    returnCircleFilter.$or = [
      { circle: { $regex: new RegExp(filters.circle, 'i') } },
      { location: { $regex: new RegExp(filters.circle, 'i') } }
    ];
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
        returnedQty: { $sum: '$lineItems.quantity' }
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

  // Build lookup maps for JMC, WIP, Returns
  const jmcMap: Record<string, number> = {};
  for (const row of jmcResult) {
    const key = `${row._id.contractorId}__${row._id.tempCode}`;
    jmcMap[key] = (jmcMap[key] || 0) + (row.consumedQty || 0);
  }

  const wipMap: Record<string, number> = {};
  for (const row of wipResult) {
    const key = `${row._id.contractorId}__${row._id.tempCode}`;
    wipMap[key] = (wipMap[key] || 0) + (row.consumedQty || 0);
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
    const cid = min._id.contractorId.toString();
    const tc = min._id.tempCode;
    const key = `${cid}__${tc}`;

    const contractorName = min.contractor?.dynamicData?.displayName || min.contractor?.name || min.contractor?.farmName || 'Unknown';
    const issuedQty = min.issuedQty || 0;
    const jmcConsumedQty = jmcMap[key] || 0;
    const wipConsumedQty = wipMap[key] || 0;
    const returnedQty = returnMap[key] || 0;
    const balance = issuedQty - jmcConsumedQty - wipConsumedQty - returnedQty;

    let status: 'balanced' | 'holding' | 'over-consumed' = 'holding';
    if (Math.abs(balance) < 0.01) status = 'balanced';
    else if (balance < 0) status = 'over-consumed';

    contractorSet.add(cid);
    rows.push({
      contractorId: cid,
      contractorName,
      tempCode: tc,
      itemName: min.itemName || '',
      unit: min.unit || 'Nos',
      issuedQty,
      jmcConsumedQty,
      wipConsumedQty,
      returnedQty,
      balance,
      status
    });

    // Remove from maps so we can detect JMC-only items later
    delete jmcMap[key];
    delete wipMap[key];
    delete returnMap[key];
  }

  // Add JMC-only items (consumed but never issued via MIN — data gap)
  for (const [key, qty] of Object.entries(jmcMap)) {
    if (qty === 0) continue;
    const [cid] = key.split('__');
    const tc = key.split('__')[1];
    contractorSet.add(cid);
    rows.push({
      contractorId: cid,
      contractorName: 'Unknown',
      tempCode: tc,
      itemName: '',
      unit: 'Nos',
      issuedQty: 0,
      jmcConsumedQty: qty,
      wipConsumedQty: wipMap[key] || 0,
      returnedQty: returnMap[key] || 0,
      balance: -(qty + (wipMap[key] || 0)),
      status: 'over-consumed'
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
      totalIssued,
      totalJmcConsumed,
      totalWipConsumed,
      totalReturned,
      totalBalance: totalIssued - totalJmcConsumed - totalWipConsumed - totalReturned,
      balancedCount,
      holdingCount,
      overConsumedCount
    }
  };
}
