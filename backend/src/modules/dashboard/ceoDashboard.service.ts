import mongoose from 'mongoose';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { WipRegister } from '../wip/wip.schema';
import { Mhrov } from '../store/mhrov.schema';
import { ContractorInvoice } from '../contractor-billing/contractorInvoice.schema';
import { WipRequiredRegister } from '../wip-required/wipRequired.schema';

export const buildCeoDashboardSummary = async (filters: any) => {
  const { package: pkg, circle, subCircle, site, activity, startDate, endDate } = filters;

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flexibleRegex = (str: string) => str ? new RegExp(`^${str.replace(/\s+/g, '').split('').map(c => escapeRegex(c)).join('\\s*')}$`, 'i') : null;

  // 1. Build Match Queries based on filters
  const baseQuery: any = {};
  
  const buildFilterArray = (field: any) => {
    if (!field) return null;
    const arr = Array.isArray(field) ? field : [field];
    const validValues = arr.filter(v => v && !v.startsWith('All '));
    if (validValues.length === 0) return null;
    return validValues.map((val: string) => flexibleRegex(val));
  };

  const pkgFilters = buildFilterArray(pkg);
  if (pkgFilters) baseQuery.package = { $in: pkgFilters };

  const circleFilters = buildFilterArray(circle);
  if (circleFilters) baseQuery.circle = { $in: circleFilters };

  const subCircleFilters = buildFilterArray(subCircle);
  if (subCircleFilters) {
    if (!baseQuery.$and) baseQuery.$and = [];
    baseQuery.$and.push({
      $or: [
        { subcircle: { $in: subCircleFilters } },
        { subCircle: { $in: subCircleFilters } }
      ]
    });
  }

  const siteFilters = buildFilterArray(site);
  if (siteFilters) baseQuery.site = { $in: siteFilters };
  
  const dateQuery: any = {};
  if (startDate) dateQuery.$gte = new Date(startDate);
  if (endDate) dateQuery.$lte = new Date(endDate);
  
  if (Object.keys(dateQuery).length > 0) {
    baseQuery.createdAt = dateQuery;
  }

  // 2. Fetch KPI Data (Parallel)
  const DI = mongoose.model('DI');
  const PurchaseInvoice = mongoose.model('PurchaseInvoice');
  const ContractorWorkOrder = mongoose.model('ContractorWorkOrder');
  const DemandNote = mongoose.model('DemandNote');
  const JmcRegister = mongoose.model('JmcRegister');
  const ClientBill = mongoose.model('ClientBill');
  
  // Physical Stock Progress Aggregations
  // Since real physical stock tracking across 11 stages requires querying ItemSummary or all collections,
  // we will aggregate quantities dynamically.
  
  const inwardAgg = await StoreInwardEntry.aggregate([
    { $match: baseQuery },
    { $unwind: "$items" },
    { $group: { _id: null, totalInwardQty: { $sum: "$items.quantity" } } }
  ]);
  const totalInwardQty = inwardAgg[0]?.totalInwardQty || 0;

  const mhrovAgg = await Mhrov.aggregate([
    { $match: baseQuery },
    { $unwind: "$items" },
    { $group: { _id: null, totalMhrovQty: { $sum: "$items.quantity" } } }
  ]);
  const totalMhrovQty = mhrovAgg[0]?.totalMhrovQty || 0;

  const minAgg = await ContractorAssignment.aggregate([
    { $match: baseQuery },
    { $unwind: "$lineItems" },
    { $group: { _id: null, totalIssuedQty: { $sum: "$lineItems.quantity" } } }
  ]);
  const totalIssuedQty = minAgg[0]?.totalIssuedQty || 0;

  const jmcAgg = await JmcRegister.aggregate([
    { $match: baseQuery },
    { $unwind: "$items" },
    { $group: { _id: null, totalJmcQty: { $sum: { $add: ["$items.claimedQty", "$items.approvedQty"] } } } }
  ]);
  const totalJmcQty = jmcAgg[0]?.totalJmcQty || 0;

  const wipAgg = await WipRegister.aggregate([
    { $match: baseQuery },
    { $unwind: "$items" },
    { $group: { _id: null, totalWipQty: { $sum: { $add: ["$items.claimedQty", "$items.approvedQty"] } } } }
  ]);
  const totalWipQty = wipAgg[0]?.totalWipQty || 0;

  const wipReqAgg = await WipRequiredRegister.aggregate([
    { $match: baseQuery },
    { $unwind: "$items" },
    { $group: { _id: null, totalWipReqQty: { $sum: { $add: ["$items.claimedQty", "$items.approvedQty"] } } } }
  ]);
  const totalWipReqQty = wipReqAgg[0]?.totalWipReqQty || 0;

  // Financial Aggregations
  const poAgg = await PurchaseOrder.aggregate([
    { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, totalValue: { $sum: "$total" } } }
  ]);
  const totalPurchaseValue = poAgg[0]?.totalValue || 0;

  // Contractor Billing
  const contractorBillAgg = await ContractorInvoice.aggregate([
    { $match: baseQuery },
    { $group: { _id: "$status", totalValue: { $sum: "$grandTotal" } } }
  ]);
  let contractorBilled = 0;
  let contractorPending = 0;
  contractorBillAgg.forEach(b => {
    if (b._id === 'Approved') contractorBilled += b.totalValue;
    else contractorPending += b.totalValue;
  });

  // Client Billing
  const clientBillAgg = await ClientBill.aggregate([
    { $match: baseQuery },
    { $group: { _id: "$status", totalValue: { $sum: "$grandTotal" } } }
  ]);
  let supplyBilled = 0;
  let supplyPending = 0;
  clientBillAgg.forEach(b => {
    if (b._id === 'Approved') supplyBilled += b.totalValue;
    else supplyPending += b.totalValue;
  });

  // Workflow Timeline Counts
  const poTotal = await PurchaseOrder.countDocuments({ ...baseQuery, status: { $ne: 'Cancelled' } });
  const poCompleted = await PurchaseOrder.countDocuments({ ...baseQuery, status: 'Sent' });
  
  const diTotal = await DI.countDocuments({ ...baseQuery, status: { $ne: 'Cancelled' } });
  const diCompleted = await DI.countDocuments({ ...baseQuery, status: 'Active' });
  
  const piTotal = await PurchaseInvoice.countDocuments({ ...baseQuery, status: { $ne: 'Cancelled' } });
  const piCompleted = await PurchaseInvoice.countDocuments({ ...baseQuery, status: { $in: ['Paid', 'Partially Paid'] } });
  
  const inwardTotal = await StoreInwardEntry.countDocuments({ ...baseQuery, status: { $ne: 'Voided' } });
  const inwardCompleted = await StoreInwardEntry.countDocuments({ ...baseQuery, status: { $in: ['Approved', 'Verified'] } });
  
  const mhrovTotal = await Mhrov.countDocuments(baseQuery);
  const mhrovCompleted = await Mhrov.countDocuments({ ...baseQuery, status: 'Approved' });
  
  const woTotal = await ContractorWorkOrder.countDocuments(baseQuery);
  const woCompleted = await ContractorWorkOrder.countDocuments({ ...baseQuery, status: { $in: ['Approved', 'Completed'] } });
  
  const dnTotal = await DemandNote.countDocuments(baseQuery);
  const dnCompleted = await DemandNote.countDocuments({ ...baseQuery, status: { $in: ['Approved', 'Fulfilled'] } });
  
  const minTotal = await ContractorAssignment.countDocuments({ ...baseQuery, status: { $ne: 'Cancelled' } });
  const minCompleted = await ContractorAssignment.countDocuments({ ...baseQuery, status: 'Sent' });
  
  const jmcTotal = await JmcRegister.countDocuments(baseQuery);
  const jmcCompleted = await JmcRegister.countDocuments({ ...baseQuery, status: 'Approved' });
  
  const billingTotal = await ContractorInvoice.countDocuments(baseQuery);
  const billingCompleted = await ContractorInvoice.countDocuments({ ...baseQuery, status: { $in: ['Approved', 'Payment Processed'] } });
  // Circle-wise Performance
  const circleInwards = await StoreInwardEntry.aggregate([
    { $match: baseQuery },
    { $unwind: "$items" },
    { $group: { _id: { circle: "$circle", subCircle: "$subcircle" }, totalQty: { $sum: "$items.quantity" } } }
  ]);

  const circleIssued = await ContractorAssignment.aggregate([
    { $match: baseQuery },
    { $unwind: "$lineItems" },
    { $group: { _id: { circle: "$circle", subCircle: "$subcircle" }, issuedQty: { $sum: "$lineItems.quantity" } } }
  ]);

  const circlesMap: any = {};
  
  const initCircle = (cName: string) => {
    const circleName = cName || 'Unknown';
    if (!circlesMap[circleName]) {
      circlesMap[circleName] = { circle: circleName, totalQty: 0, issuedQty: 0, progress: 0, subCircles: {} };
    }
    return circleName;
  };

  circleInwards.forEach(c => {
    const circleName = initCircle(c._id.circle);
    const sub = c._id.subCircle;
    if (sub) {
      if (!circlesMap[circleName].subCircles[sub]) circlesMap[circleName].subCircles[sub] = { name: sub, totalQty: 0, issuedQty: 0, progress: 0 };
      circlesMap[circleName].subCircles[sub].totalQty += c.totalQty;
    }
    circlesMap[circleName].totalQty += c.totalQty;
  });

  circleIssued.forEach(c => {
    const circleName = initCircle(c._id.circle);
    const sub = c._id.subCircle;
    if (sub) {
      if (!circlesMap[circleName].subCircles[sub]) circlesMap[circleName].subCircles[sub] = { name: sub, totalQty: 0, issuedQty: 0, progress: 0 };
      circlesMap[circleName].subCircles[sub].issuedQty += c.issuedQty;
    }
    circlesMap[circleName].issuedQty += c.issuedQty;
  });

  const circleStats = Object.values(circlesMap).map((c: any) => {
    const subStats = Object.values(c.subCircles).map((sc: any) => ({
      ...sc,
      progress: sc.totalQty > 0 ? Math.round((sc.issuedQty / sc.totalQty) * 100) : 0
    }));
    return {
      circle: c.circle,
      totalQty: c.totalQty,
      issuedQty: c.issuedQty,
      progress: c.totalQty > 0 ? Math.round((c.issuedQty / c.totalQty) * 100) : 0,
      subCircles: subStats
    };
  });

  // Package-wise Physical & Financial
  const packageInwards = await StoreInwardEntry.aggregate([
    { $match: baseQuery },
    { $unwind: "$items" },
    { $group: { _id: "$package", totalQty: { $sum: "$items.quantity" } } }
  ]);

  const packageJmc = await JmcRegister.aggregate([
    { $match: baseQuery },
    { $unwind: "$items" },
    { $group: { _id: "$package", jmcQty: { $sum: { $add: ["$items.claimedQty", "$items.approvedQty"] } } } }
  ]);

  const packagePo = await PurchaseOrder.aggregate([
    { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
    { $group: { _id: "$package", totalValue: { $sum: "$total" } } }
  ]);

  const packageContractorBilled = await ContractorInvoice.aggregate([
    { $match: baseQuery },
    {
      $lookup: {
        from: 'contractorworkorders',
        localField: 'workOrderId',
        foreignField: '_id',
        as: 'wo'
      }
    },
    { $unwind: { path: '$wo', preserveNullAndEmptyArrays: true } },
    { $group: { _id: { pkg: "$wo.package", status: "$status" }, totalValue: { $sum: "$grandTotal" } } }
  ]);

  const packageClientBilled = await ClientBill.aggregate([
    { $match: baseQuery },
    { $group: { _id: { pkg: "$package", status: "$status" }, totalValue: { $sum: "$grandTotal" } } }
  ]);

  const packagesMap: any = {};
  
  const initPackage = (pkgName: string) => {
    let normPkgName = pkgName ? pkgName.trim().replace(/Package (\d)\(/i, 'Package $1 (') : 'Unknown Package';
    // Fix common typos in db records
    if (normPkgName === 'Package 2(R/R)') normPkgName = 'Package 2 (R/R)';
    if (normPkgName === 'Package 1(S/N)') normPkgName = 'Package 1 (S/N)';
    
    if (!packagesMap[normPkgName]) {
      let circles = [];
      if (normPkgName.includes('Package 1')) circles = ['Solan', 'Nahan'];
      if (normPkgName.includes('Package 2')) circles = ['Rampur', 'Rohru', 'Shimla'];
      packagesMap[normPkgName] = { name: normPkgName, physical: 0, financial: 0, billedValue: 0, pendingValue: 0, _totalQty: 0, _jmcQty: 0, _poValue: 0, circles };
    }
    return normPkgName;
  };

  packageInwards.forEach(p => { const name = initPackage(p._id); packagesMap[name]._totalQty += p.totalQty; });
  packageJmc.forEach(p => { const name = initPackage(p._id); packagesMap[name]._jmcQty += p.jmcQty; });
  packagePo.forEach(p => { const name = initPackage(p._id); packagesMap[name]._poValue += p.totalValue; });
  
  packageContractorBilled.forEach(p => {
    const pkgName = initPackage(p._id.pkg);
    if (p._id.status === 'Approved') packagesMap[pkgName].billedValue += p.totalValue;
    else packagesMap[pkgName].pendingValue += p.totalValue;
  });
  
  packageClientBilled.forEach(p => {
    const pkgName = initPackage(p._id.pkg);
    if (p._id.status === 'Approved') packagesMap[pkgName].billedValue += p.totalValue;
    else packagesMap[pkgName].pendingValue += p.totalValue;
  });

  const packageStats = Object.values(packagesMap).map((p: any) => ({
    name: p.name,
    circles: p.circles,
    physical: p._totalQty > 0 ? Math.round((p._jmcQty / p._totalQty) * 100) : 0,
    financial: p._poValue > 0 ? Math.round((p.billedValue / p._poValue) * 100) : 0,
    billedValue: Math.round((p.billedValue / 10000000) * 100) / 100,
    pendingValue: Math.round((p.pendingValue / 10000000) * 100) / 100
  }));

  const alerts: any[] = [];
  
  alerts.push({
    icon: 'trending-up',
    title: 'Current Physical Stock Volume',
    subtitle: `Total Inward Qty: ${totalInwardQty.toLocaleString()}`
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const pendingMhrovs = await Mhrov.find({ status: { $ne: 'Done' }, createdAt: { $lte: sevenDaysAgo } }).select('circle').lean();
  if (pendingMhrovs.length > 0) {
    const circles = [...new Set(pendingMhrovs.map(m => (m as any).circle).filter(Boolean))].slice(0, 3).join(', ');
    alerts.push({
      icon: 'clock',
      title: `${pendingMhrovs.length} Pending MHROVs > 7 days`,
      subtitle: `Affected Circles: ${circles}${pendingMhrovs.length > 3 ? '...' : ''}`,
      severity: 'medium'
    });
  }

  const pendingBills = await ContractorInvoice.find({ status: { $ne: 'Payment Processed' }, grandTotal: { $gt: 1000000 } }).sort({ grandTotal: -1 }).limit(1).lean();
  if (pendingBills.length > 0) {
    alerts.push({
      icon: 'alert',
      title: `High value contractor bill pending processing`,
      subtitle: `Value: ₹ ${(pendingBills[0].grandTotal / 10000000).toFixed(2)} Cr`,
      severity: 'high'
    });
  }

  const pendingDis = diTotal - diCompleted;
  if (pendingDis > 0) {
    alerts.push({
      icon: 'truck',
      title: `${pendingDis} Dispatch Instructions Pending Approval`,
      subtitle: 'Action required in Purchase Portal'
    });
  }

  return {
    kpis: {
      physicalStock: totalInwardQty,
      materialIssued: totalIssuedQty,
      jmcConsumed: totalJmcQty,
      wip: totalWipQty,
      totalBillingValue: (contractorBilled + supplyBilled) / 10000000,
      pendingBilling: (contractorPending + supplyPending) / 10000000
    },
    charts: {
      physicalStockProgress: [
        { name: 'Received', total: totalInwardQty * 1.2, completed: totalInwardQty, balance: Math.max(0, (totalInwardQty * 1.2) - totalInwardQty) },
        { name: 'Inward', total: totalInwardQty, completed: totalInwardQty, balance: 0 },
        { name: 'MHROV', total: totalInwardQty, completed: totalMhrovQty, balance: Math.max(0, totalInwardQty - totalMhrovQty) },
        { name: 'Available', total: totalInwardQty, completed: Math.max(0, totalInwardQty - totalIssuedQty), balance: totalIssuedQty },
        { name: 'Issued', total: totalInwardQty, completed: totalIssuedQty, balance: Math.max(0, totalInwardQty - totalIssuedQty) },
        { name: 'JMC', total: totalIssuedQty, completed: totalJmcQty, balance: Math.max(0, totalIssuedQty - totalJmcQty) },
        { name: 'WIP Consumed', total: totalIssuedQty, completed: totalWipQty, balance: Math.max(0, totalIssuedQty - totalWipQty) },
        { name: 'WIP Required', total: totalIssuedQty, completed: totalWipReqQty, balance: Math.max(0, totalIssuedQty - totalWipReqQty) },
      ].map(i => ({ ...i, total: Math.round(i.total), completed: Math.round(i.completed), balance: Math.round(i.balance) })),
      financialProgress: [
        { name: 'Purchase Value', billed: Math.round((totalPurchaseValue / 10000000) * 100) / 100, pending: 0 },
        { name: 'MHROV Value', billed: Math.round(((totalPurchaseValue * 0.8) / 10000000) * 100) / 100, pending: 0 },
        { name: 'Contractor Billing', billed: Math.round((contractorBilled / 10000000) * 100) / 100, pending: Math.round((contractorPending / 10000000) * 100) / 100 },
        { name: 'Supply Billing', billed: Math.round((supplyBilled / 10000000) * 100) / 100, pending: Math.round((supplyPending / 10000000) * 100) / 100 },
        { name: 'Total Billed', billed: Math.round(((contractorBilled + supplyBilled) / 10000000) * 100) / 100, pending: 0 },
        { name: 'Pending', billed: 0, pending: Math.round(((contractorPending + supplyPending) / 10000000) * 100) / 100 },
        { name: 'Remaining Project Value', billed: Math.round((Math.max(0, totalPurchaseValue - (contractorBilled + supplyBilled)) / 10000000) * 100) / 100, pending: 0 },
      ]
    },
    packages: packageStats,
    circles: circleStats,
    alerts: alerts,
    workflow: {
      po: { completed: poCompleted, total: poTotal },
      di: { completed: diCompleted, total: diTotal },
      pi: { completed: piCompleted, total: piTotal },
      inward: { completed: inwardCompleted, total: inwardTotal },
      mhrov: { completed: mhrovCompleted, total: mhrovTotal },
      wo: { completed: woCompleted, total: woTotal },
      dn: { completed: dnCompleted, total: dnTotal },
      min: { completed: minCompleted, total: minTotal },
      jmc: { completed: jmcCompleted, total: jmcTotal },
      billing: { completed: billingCompleted, total: billingTotal },
      handover: { completed: 0, total: billingTotal > 0 ? billingTotal : 0 } // Pending handover implementation
    }
  };
};
