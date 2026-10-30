import mongoose from 'mongoose';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import { StoreTransfer } from '../store/storeTransfer.schema';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { WipRegister } from '../wip/wip.schema';
import { Mhrov } from '../store/mhrov.schema';
import { ContractorInvoice } from '../contractor-billing/contractorInvoice.schema';
import { WipRequiredRegister } from '../wip-required/wipRequired.schema';
import { DI } from '../di/di.schema';
import { PurchaseInvoice } from '../purchases/purchaseInvoice.schema';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import DemandNote from '../demand-notes/demandNote.schema';
import { ClientBill } from '../client-billing/clientBill.schema';
import { JmcRegister } from '../jmc/jmc.schema';
import { HandoverCertificate } from '../contractor-billing/handoverCertificate.schema';

const ceoDashboardCache = new Map<string, { timestamp: number; data: any; promise: Promise<any> | null }>();
const CEO_DASHBOARD_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const clearCeoDashboardCache = () => {
  ceoDashboardCache.clear();
};

export const buildCeoDashboardSummary = async (filters: any) => {
  const cacheKey = JSON.stringify(filters || {});
  const cached = ceoDashboardCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CEO_DASHBOARD_CACHE_TTL)) {
    if (cached.promise) return await cached.promise;
    if (cached.data) return cached.data;
  }

  const fetchPromise = (async () => {
    const { package: pkg, circle, subCircle, site, startDate, endDate } = filters || {};

    const getNormalizedVariants = (val: string): string[] => {
      if (!val) return [];
      const t = val.trim();
      return Array.from(new Set([t, t.toUpperCase(), t.toLowerCase(), t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(), `${t} `]));
    };

    // 1. Build Match Queries based on filters
    const baseQuery: any = {};

    const buildFilterArray = (field: any) => {
      if (!field) return null;
      const arr = Array.isArray(field) ? field : [field];
      const validValues = arr.filter(v => v && !v.startsWith('All '));
      if (validValues.length === 0) return null;
      const variants: string[] = [];
      validValues.forEach((val: string) => variants.push(...getNormalizedVariants(val)));
      return Array.from(new Set(variants));
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

    // 2. Fetch KPI Data (Fully Parallelized via Promise.all)
    const transferInMatch: any = { status: 'RECEIVED' };
    if (circleFilters) transferInMatch.toStore = { $in: circleFilters };
    if (subCircleFilters) transferInMatch.toStore = { $in: subCircleFilters };
    if (dateQuery && Object.keys(dateQuery).length) transferInMatch.createdAt = dateQuery;

    const transferOutMatch: any = { status: { $in: ['IN_TRANSIT', 'RECEIVED'] } };
    if (circleFilters) transferOutMatch.fromStore = { $in: circleFilters };
    if (subCircleFilters) transferOutMatch.fromStore = { $in: subCircleFilters };
    if (dateQuery && Object.keys(dateQuery).length) transferOutMatch.createdAt = dateQuery;

    const transitDetailsMatch: any = { status: 'IN_TRANSIT' };
    if (circleFilters) transitDetailsMatch.fromStore = { $in: circleFilters };
    if (subCircleFilters) transitDetailsMatch.fromStore = { $in: subCircleFilters };
    if (dateQuery && Object.keys(dateQuery).length) transitDetailsMatch.createdAt = dateQuery;

    const piLineItemQuery: any = {};
    if (pkgFilters) piLineItemQuery["lineItems.package"] = { $in: pkgFilters };
    if (circleFilters) piLineItemQuery["lineItems.circle"] = { $in: circleFilters };
    if (subCircleFilters) {
      piLineItemQuery.$and = [{
        $or: [
          { "lineItems.subcircle": { $in: subCircleFilters } },
          { "lineItems.subCircle": { $in: subCircleFilters } }
        ]
      }];
    }
    if (Object.keys(dateQuery).length > 0) piLineItemQuery.createdAt = dateQuery;

    const clientBillMatch: any = { status: { $ne: 'Rejected' } };
    const contractorInvoiceMatch: any = { status: { $nin: ['Rejected', 'Cancelled'] } };

    if (circle && circle !== 'All') {
      const circleClean = circle.trim();
      const circleRegex = new RegExp(`^${circleClean}$`, 'i');
      clientBillMatch.circle = circleRegex;
      contractorInvoiceMatch.$or = [
        { circle: circleRegex },
        { "legacyMetadata.circle": circleRegex }
      ];
    } else if (circleFilters && circleFilters.length > 0) {
      clientBillMatch.circle = { $in: circleFilters };
      contractorInvoiceMatch.$or = [
        { circle: { $in: circleFilters } },
        { "legacyMetadata.circle": { $in: circleFilters } }
      ];
    }

    if (pkg && pkg !== 'All') {
      const pkgNum = pkg.includes('1') ? '1' : pkg.includes('2') ? '2' : '';
      if (pkgNum) {
        const pkgRegex = new RegExp(`Package[\\s-]*${pkgNum}`, 'i');
        clientBillMatch.package = pkgRegex;
        const pkgCond = [
          { package: pkgRegex },
          { "legacyMetadata.package": pkgRegex }
        ];
        if (contractorInvoiceMatch.$or) {
          contractorInvoiceMatch.$and = [
            { $or: contractorInvoiceMatch.$or },
            { $or: pkgCond }
          ];
          delete contractorInvoiceMatch.$or;
        } else {
          contractorInvoiceMatch.$or = pkgCond;
        }
      }
    } else if (pkgFilters && pkgFilters.length > 0) {
      clientBillMatch.package = { $in: pkgFilters };
      const pkgCond = [
        { package: { $in: pkgFilters } },
        { "legacyMetadata.package": { $in: pkgFilters } }
      ];
      if (contractorInvoiceMatch.$or) {
        contractorInvoiceMatch.$and = [
          { $or: contractorInvoiceMatch.$or },
          { $or: pkgCond }
        ];
        delete contractorInvoiceMatch.$or;
      } else {
        contractorInvoiceMatch.$or = pkgCond;
      }
    }

    if (Object.keys(dateQuery).length > 0) {
      clientBillMatch.createdAt = dateQuery;
      contractorInvoiceMatch.createdAt = dateQuery;
    }

    const handoverMatch: any = { status: { $ne: 'Cancelled' } };
    if (circleFilters && circleFilters.length > 0) {
      handoverMatch['locationDetails.circle'] = { $in: circleFilters };
    }
    if (pkgFilters && pkgFilters.length > 0) {
      handoverMatch['locationDetails.package'] = { $in: pkgFilters };
    }
    if (Object.keys(dateQuery).length > 0) {
      handoverMatch.createdAt = dateQuery;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      inwardAgg,
      tiAgg,
      toAgg,
      inTransitAgg,
      minAgg,
      mhrovAgg,
      jmcAgg,
      wipAgg,
      wipReqAgg,
      poAgg,
      piAgg,
      contractorBillAgg,
      clientBillAgg,
      woAgg,
      poStatusCounts,
      diStatusCounts,
      piCountAgg,
      piCompletedAgg,
      inwardStatusCounts,
      mhrovStatusCounts,
      woStatusCounts,
      dnStatusCounts,
      minStatusCounts,
      jmcStatusCounts,
      billingStatusCounts,
      handoverStatusCounts,
      circleInwards,
      circleIssued,
      packageInwards,
      packageJmc,
      packagePo,
      packageContractorBilled,
      packageClientBilled,
      pendingMhrovs,
      pendingBills
    ] = await Promise.all([
      StoreInwardEntry.aggregate([
        { $match: baseQuery },
        { $group: { _id: null, totalInwardQty: { $sum: "$totalQty" } } }
      ]),

      StoreTransfer.aggregate([
        { $match: transferInMatch },
        { $unwind: "$items" },
        { $group: { _id: null, qty: { $sum: "$items.receivedQty" } } }
      ]),

      StoreTransfer.aggregate([
        { $match: transferOutMatch },
        { $unwind: "$items" },
        { $group: { _id: null, qty: { $sum: "$items.dispatchedQty" } } }
      ]),

      StoreTransfer.aggregate([
        { $match: transitDetailsMatch },
        { $unwind: '$items' },
        { $group: { _id: { from: '$fromStore', to: '$toStore' }, qty: { $sum: '$items.dispatchedQty' } } },
        { $sort: { qty: -1 } }
      ]),

      ContractorAssignment.aggregate([
        { $match: baseQuery },
        { $unwind: "$lineItems" },
        { $group: { _id: null, totalIssuedQty: { $sum: "$lineItems.quantity" } } }
      ]),

      Mhrov.aggregate([
        { $match: baseQuery },
        { $unwind: "$items" },
        { $group: { _id: null, totalMhrovQty: { $sum: "$items.quantity" } } }
      ]),

      JmcRegister.aggregate([
        { $match: baseQuery },
        { $unwind: "$items" },
        { $group: { _id: null, totalJmcQty: { $sum: { $add: ["$items.claimedQty", "$items.approvedQty"] } } } }
      ]),

      WipRegister.aggregate([
        { $match: baseQuery },
        { $unwind: "$items" },
        { $group: { _id: null, totalWipQty: { $sum: { $add: ["$items.claimedQty", "$items.approvedQty"] } } } }
      ]),

      WipRequiredRegister.aggregate([
        { $match: baseQuery },
        { $unwind: "$items" },
        { $group: { _id: null, totalWipReqQty: { $sum: { $add: ["$items.claimedQty", "$items.approvedQty"] } } } }
      ]),

      PurchaseOrder.aggregate([
        { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, totalValue: { $sum: "$total" } } }
      ]),

      PurchaseInvoice.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $unwind: "$lineItems" },
        { $match: piLineItemQuery },
        { $group: { _id: null, totalValue: { $sum: "$total" }, totalQty: { $sum: "$lineItems.quantity" } } }
      ]),

      ContractorInvoice.aggregate([
        { $match: contractorInvoiceMatch },
        {
          $group: {
            _id: {
              circle: { $ifNull: ["$circle", "$legacyMetadata.circle"] },
              package: { $ifNull: ["$package", "$legacyMetadata.package"] },
              billingCategory: "$billingCategory",
              stage: "$stage",
              status: "$status"
            },
            totalValue: { $sum: "$grandTotal" },
            baseValue: { $sum: "$totalBaseAmount" },
            gstValue: { $sum: "$totalGstAmount" },
            count: { $sum: 1 }
          }
        }
      ]),

      ClientBill.aggregate([
        { $match: clientBillMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: {
              circle: "$circle",
              package: "$package",
              stage: "$stage",
              billType: "$billType",
              status: "$status",
              billId: "$_id"
            },
            billTotal: { $sum: { $add: ["$items.totalAmount", { $ifNull: ["$items.gstAmount", 0] }] } },
            billBase: { $sum: "$items.totalAmount" },
            billGst: { $sum: { $ifNull: ["$items.gstAmount", 0] } }
          }
        },
        {
          $group: {
            _id: {
              circle: "$_id.circle",
              package: "$_id.package",
              stage: "$_id.stage",
              billType: "$_id.billType",
              status: "$_id.status"
            },
            totalValue: { $sum: "$billTotal" },
            baseValue: { $sum: "$billBase" },
            gstValue: { $sum: "$billGst" },
            count: { $sum: 1 }
          }
        }
      ]),

      ContractorWorkOrder.aggregate([
        { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, totalValue: { $sum: "$totalWoAmount" }, count: { $sum: 1 } } }
      ]),

      // Grouped status counts
      PurchaseOrder.aggregate([
        { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      DI.aggregate([
        { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      PurchaseInvoice.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $unwind: "$lineItems" },
        { $match: piLineItemQuery },
        { $group: { _id: "$_id" } },
        { $count: "count" }
      ]),

      PurchaseInvoice.aggregate([
        { $match: { status: { $in: ['Posted', 'Cleared', 'Paid', 'Approved'] } } },
        { $unwind: "$lineItems" },
        { $match: piLineItemQuery },
        { $group: { _id: "$_id" } },
        { $count: "count" }
      ]),

      StoreInwardEntry.aggregate([
        { $match: { ...baseQuery, status: { $ne: 'Voided' } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      Mhrov.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      ContractorWorkOrder.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      DemandNote.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      ContractorAssignment.aggregate([
        { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      JmcRegister.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      ClientBill.aggregate([
        { $match: clientBillMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      HandoverCertificate.aggregate([
        { $match: handoverMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // Circle Performance
      StoreInwardEntry.aggregate([
        { $match: baseQuery },
        { $group: { _id: { circle: "$circle", subCircle: "$subcircle" }, totalQty: { $sum: "$totalQty" } } }
      ]),

      ContractorAssignment.aggregate([
        { $match: baseQuery },
        { $unwind: "$lineItems" },
        { $group: { _id: { circle: "$circle", subCircle: "$subcircle" }, issuedQty: { $sum: "$lineItems.quantity" } } }
      ]),

      // Package Performance
      StoreInwardEntry.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$package", totalQty: { $sum: "$totalQty" } } }
      ]),

      JmcRegister.aggregate([
        { $match: baseQuery },
        { $unwind: "$items" },
        { $group: { _id: "$package", jmcQty: { $sum: { $add: ["$items.claimedQty", "$items.approvedQty"] } } } }
      ]),

      PurchaseOrder.aggregate([
        { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
        { $group: { _id: "$package", totalValue: { $sum: "$total" } } }
      ]),

      ContractorInvoice.aggregate([
        { $match: contractorInvoiceMatch },
        {
          $lookup: {
            from: 'contractorworkorders',
            localField: 'workOrderId',
            foreignField: '_id',
            as: 'wo'
          }
        },
        { $unwind: { path: '$wo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              pkg: { $ifNull: ["$package", { $ifNull: ["$legacyMetadata.package", "$wo.package"] }] },
              status: "$status"
            },
            totalValue: { $sum: "$grandTotal" }
          }
        }
      ]),

      ClientBill.aggregate([
        { $match: clientBillMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: { pkg: "$package", status: "$status" },
            totalValue: { $sum: { $add: ["$items.totalAmount", { $ifNull: ["$items.gstAmount", 0] }] } }
          }
        }
      ]),

      Mhrov.find({ status: { $ne: 'Done' }, createdAt: { $lte: sevenDaysAgo } }).select('circle').lean(),

      ContractorInvoice.find({ status: { $ne: 'Payment Processed' }, grandTotal: { $gt: 1000000 } }).sort({ grandTotal: -1 }).limit(1).lean()
    ]);

    const totalInwardQty = inwardAgg[0]?.totalInwardQty || 0;
    const totalTransferInQty = tiAgg[0]?.qty || 0;
    const totalTransferOutQty = toAgg[0]?.qty || 0;

    const transitDetails = inTransitAgg.map(t => ({
      from: t._id.from || 'Unknown',
      to: t._id.to || 'Unknown',
      qty: t.qty
    }));

    const totalIssuedQty = minAgg[0]?.totalIssuedQty || 0;
    const totalMhrovQty = mhrovAgg[0]?.totalMhrovQty || 0;
    const availableStock = totalInwardQty + totalTransferInQty - totalIssuedQty - totalTransferOutQty;

    const totalJmcQty = jmcAgg[0]?.totalJmcQty || 0;
    const totalWipQty = wipAgg[0]?.totalWipQty || 0;
    const totalWipReqQty = wipReqAgg[0]?.totalWipReqQty || 0;

    const totalPurchaseValue = poAgg[0]?.totalValue || 0;
    const totalPIValue = piAgg[0]?.totalValue || 0;
    const totalPIQty = piAgg[0]?.totalQty || 0;

    // Contractor & Client Billing (Supply + Erection Reconciliation)
    let contractorBilled = 0;
    let contractorPending = 0;
    let erectionBilled = 0;
    let erectionBase = 0;
    let erectionGst = 0;
    let erectionCount = 0;

    let supplyBilled = 0;
    let supplyBase = 0;
    let supplyGst = 0;
    let supplyPending = 0;
    let supplyCount = 0;

    const normalizeCircle = (c: any) => {
      if (!c) return 'Unknown';
      const s = String(c).trim();
      const u = s.toUpperCase();
      if (u === 'ROHRU') return 'Rohru';
      if (u === 'SOLAN' || u === 'KUMARHATTI' || u === 'NALAGARH') return 'Solan';
      if (u === 'RAMPUR') return 'Rampur';
      if (u === 'NAHAN') return 'Nahan';
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    };

    const circleBillingMap: Record<string, any> = {};
    const getCircleBilling = (cName: string) => {
      const key = normalizeCircle(cName);
      if (!circleBillingMap[key]) {
        circleBillingMap[key] = {
          circle: key,
          supplyAmount: 0,
          supplyBase: 0,
          supplyGst: 0,
          supplyCount: 0,
          erectionAmount: 0,
          erectionBase: 0,
          erectionGst: 0,
          erectionCount: 0,
          totalAmount: 0,
          totalCount: 0
        };
      }
      return circleBillingMap[key];
    };

    // Process Client Bills (Supply 60%)
    clientBillAgg.forEach(b => {
      supplyBilled += b.totalValue;
      supplyBase += b.baseValue;
      supplyGst += b.gstValue;
      supplyCount += b.count;
      if (b._id.status !== 'Approved') {
        supplyPending += b.totalValue;
      }

      const bucket = getCircleBilling(b._id.circle);
      bucket.supplyAmount += b.totalValue;
      bucket.supplyBase += b.baseValue;
      bucket.supplyGst += b.gstValue;
      bucket.supplyCount += b.count;
      bucket.totalAmount += b.totalValue;
      bucket.totalCount += b.count;
    });

    // Process Contractor Invoices (Erection 90%)
    contractorBillAgg.forEach(b => {
      contractorBilled += b.totalValue;
      erectionBilled += b.totalValue;
      erectionBase += b.baseValue;
      erectionGst += b.gstValue;
      erectionCount += b.count;
      if (b._id.status !== 'Approved' && b._id.status !== 'Payment Processed') {
        contractorPending += b.totalValue;
      }

      const bucket = getCircleBilling(b._id.circle);
      bucket.erectionAmount += b.totalValue;
      bucket.erectionBase += b.baseValue;
      bucket.erectionGst += b.gstValue;
      bucket.erectionCount += b.count;
      bucket.totalAmount += b.totalValue;
      bucket.totalCount += b.count;
    });

    const billingCircles = Object.values(circleBillingMap).sort((a, b) => b.totalAmount - a.totalAmount);

    const totalWoValue = woAgg[0]?.totalValue || 0;
    const woCount = woAgg[0]?.count || 0;

    // Map status counts helper
    const buildCountMap = (list: any[]) => {
      const map = new Map<string, number>();
      let total = 0;
      list.forEach(item => {
        map.set(item._id, item.count);
        total += item.count;
      });
      return { map, total };
    };

    const poCounts = buildCountMap(poStatusCounts);
    const poTotal = poCounts.total;
    const poCompleted = poCounts.map.get('Sent') || 0;
    const poPending = poCounts.map.get('Pending') || 0;
    const poCleared = poCounts.map.get('Cleared') || 0;

    const diCounts = buildCountMap(diStatusCounts);
    const diTotal = diCounts.total;
    const diCompleted = diCounts.map.get('Active') || 0;

    const piTotal = piCountAgg[0]?.count || 0;
    const piCompleted = piCompletedAgg[0]?.count || 0;

    const inwardCounts = buildCountMap(inwardStatusCounts);
    const inwardTotal = inwardCounts.total;
    const inwardCompleted = (inwardCounts.map.get('Approved') || 0) + (inwardCounts.map.get('Verified') || 0);

    const mhrovCounts = buildCountMap(mhrovStatusCounts);
    const mhrovTotal = mhrovCounts.total;
    let mhrovCompleted = 0;
    mhrovCounts.map.forEach((count, status) => {
      if (['done', 'approved', 'verified', 'completed'].includes((status || '').toLowerCase())) {
        mhrovCompleted += count;
      }
    });

    const woCounts = buildCountMap(woStatusCounts);
    const woTotal = woCounts.total;
    const woCompleted = (woCounts.map.get('Approved') || 0) + (woCounts.map.get('Completed') || 0);

    const dnCounts = buildCountMap(dnStatusCounts);
    const dnTotal = dnCounts.total;
    const dnCompleted = (dnCounts.map.get('Approved') || 0) + (dnCounts.map.get('Fulfilled') || 0);

    const minCounts = buildCountMap(minStatusCounts);
    const minTotal = minCounts.total;
    const minCompleted = minCounts.map.get('Sent') || 0;

    const jmcCounts = buildCountMap(jmcStatusCounts);
    const jmcTotal = jmcCounts.total;
    const jmcCompleted = jmcCounts.map.get('Approved') || 0;

    const billingCounts = buildCountMap(billingStatusCounts);
    const billingTotal = billingCounts.total;
    let billingCompleted = 0;
    billingCounts.map.forEach((count, status) => {
      if (['approved', 'payment processed', 'cleared', 'billed'].includes((status || '').toLowerCase())) {
        billingCompleted += count;
      }
    });

    const handoverCounts = buildCountMap(handoverStatusCounts);
    const handoverTotal = handoverCounts.total;
    let handoverCompleted = 0;
    handoverCounts.map.forEach((count, status) => {
      if (['issued', 'approved', 'completed'].includes((status || '').toLowerCase())) {
        handoverCompleted += count;
      }
    });

    // Circle-wise Performance
    const circlesMap: any = {};
    const initCircle = (cName: string) => {
      const originalName = (cName || 'Unknown').trim();
      const displayCircleName = originalName === 'Unknown' ? 'Unknown' : 
        originalName.charAt(0).toUpperCase() + originalName.slice(1).toLowerCase();
      const key = displayCircleName.toUpperCase();

      if (!circlesMap[key]) {
        circlesMap[key] = { circle: displayCircleName, totalQty: 0, issuedQty: 0, progress: 0, subCircles: {} };
      }
      return key;
    };

    circleInwards.forEach(c => {
      let rawCircle = c._id.circle;
      let rawSub = c._id.subCircle;
      
      const cUpper = (rawCircle || '').trim().toUpperCase();
      if (cUpper === 'KUMARHATTI' || cUpper === 'NALAGARH') {
        rawCircle = 'Solan';
        if (!rawSub) rawSub = cUpper === 'KUMARHATTI' ? 'Kumarhatti' : 'Nalagarh';
      }

      const circleKey = initCircle(rawCircle);
      if (rawSub) {
        const subKey = rawSub.trim().toUpperCase();
        const displaySubName = rawSub.trim().charAt(0).toUpperCase() + rawSub.trim().slice(1).toLowerCase();
        if (!circlesMap[circleKey].subCircles[subKey]) circlesMap[circleKey].subCircles[subKey] = { name: displaySubName, totalQty: 0, issuedQty: 0, progress: 0 };
        circlesMap[circleKey].subCircles[subKey].totalQty += c.totalQty;
      }
      circlesMap[circleKey].totalQty += c.totalQty;
    });

    circleIssued.forEach(c => {
      let rawCircle = c._id.circle;
      let rawSub = c._id.subCircle;
      
      const cUpper = (rawCircle || '').trim().toUpperCase();
      if (cUpper === 'KUMARHATTI' || cUpper === 'NALAGARH') {
        rawCircle = 'Solan';
        if (!rawSub) rawSub = cUpper === 'KUMARHATTI' ? 'Kumarhatti' : 'Nalagarh';
      }

      const circleKey = initCircle(rawCircle);
      if (rawSub) {
        const subKey = rawSub.trim().toUpperCase();
        const displaySubName = rawSub.trim().charAt(0).toUpperCase() + rawSub.trim().slice(1).toLowerCase();
        if (!circlesMap[circleKey].subCircles[subKey]) circlesMap[circleKey].subCircles[subKey] = { name: displaySubName, totalQty: 0, issuedQty: 0, progress: 0 };
        circlesMap[circleKey].subCircles[subKey].issuedQty += c.issuedQty;
      }
      circlesMap[circleKey].issuedQty += c.issuedQty;
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
    const packagesMap: any = {};
    const initPackage = (pkgName: string) => {
      let raw = (pkgName || '').trim();
      let normPkgName = 'Package 1 (S/N)';
      
      // Robust normalization matching Package 1 / Package 2 regardless of hyphen, space, case
      if (/package[\s-_]*2/i.test(raw)) {
        normPkgName = 'Package 2 (R/R)';
      } else if (/package[\s-_]*1/i.test(raw)) {
        normPkgName = 'Package 1 (S/N)';
      } else if (raw.toLowerCase().includes('rampur') || raw.toLowerCase().includes('rohru')) {
        normPkgName = 'Package 2 (R/R)';
      } else if (raw.toLowerCase().includes('solan') || raw.toLowerCase().includes('nahan')) {
        normPkgName = 'Package 1 (S/N)';
      } else {
        normPkgName = raw || 'Package 1 (S/N)';
      }
      
      if (!packagesMap[normPkgName]) {
        let circles: string[] = [];
        if (normPkgName.includes('Package 1')) circles = ['Solan', 'Nahan'];
        if (normPkgName.includes('Package 2')) circles = ['Rampur', 'Rohru'];
        packagesMap[normPkgName] = { name: normPkgName, physical: 0, financial: 0, billedValue: 0, pendingValue: 0, _totalQty: 0, _jmcQty: 0, _poValue: 0, circles };
      }
      return normPkgName;
    };

    packageInwards.forEach(p => { const name = initPackage(p._id); packagesMap[name]._totalQty += p.totalQty; });
    packageJmc.forEach(p => { const name = initPackage(p._id); packagesMap[name]._jmcQty += p.jmcQty; });
    packagePo.forEach(p => { const name = initPackage(p._id); packagesMap[name]._poValue += p.totalValue; });
    
    packageContractorBilled.forEach(p => {
      const pName = initPackage(p._id.pkg);
      packagesMap[pName].billedValue += p.totalValue;
    });
    
    packageClientBilled.forEach(p => {
      const pName = initPackage(p._id.pkg);
      if (p._id.status === 'Approved') packagesMap[pName].billedValue += p.totalValue;
      else packagesMap[pName].pendingValue += p.totalValue;
    });

    const packageStats = Object.values(packagesMap).map((p: any) => {
      let finPercent = 0;
      if (p._poValue > 0) {
        finPercent = Math.min(100, Math.round((p.billedValue / p._poValue) * 100));
      } else if (p.billedValue > 0) {
        finPercent = 100;
      }
      return {
        name: p.name,
        circles: p.circles,
        physical: p._totalQty > 0 ? Math.min(100, Math.round((p._jmcQty / p._totalQty) * 100)) : 0,
        financial: finPercent,
        billedValue: Math.round((p.billedValue / 10000000) * 100) / 100,
        pendingValue: Math.round((p.pendingValue / 10000000) * 100) / 100
      };
    });

    const alerts: any[] = [];
    alerts.push({
      icon: 'trending-up',
      title: 'Current Physical Stock Volume',
      subtitle: `Total Inward Qty: ${totalInwardQty.toLocaleString()}`
    });

    if (pendingMhrovs.length > 0) {
      const circles = [...new Set(pendingMhrovs.map(m => (m as any).circle).filter(Boolean))].slice(0, 3).join(', ');
      alerts.push({
        icon: 'clock',
        title: `${pendingMhrovs.length} Pending MHROVs > 7 days`,
        subtitle: `Affected Circles: ${circles}${pendingMhrovs.length > 3 ? '...' : ''}`,
        severity: 'medium'
      });
    }

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

    const responsePayload = {
      kpis: {
        physicalStock: availableStock,
        totalInwardQty: totalInwardQty,
        totalTransferInQty: totalTransferInQty,
        totalTransferOutQty: totalTransferOutQty,
        transitDetails: transitDetails,
        materialIssued: totalIssuedQty,
        jmcConsumed: totalJmcQty,
        wip: totalWipQty,
        totalBillingValue: (supplyBilled + erectionBilled) / 10000000,
        totalBillingValueRaw: supplyBilled + erectionBilled,
        pendingBilling: (supplyPending + contractorPending) / 10000000,
        supplyBilled: supplyBilled / 10000000,
        supplyBilledRaw: supplyBilled,
        supplyBaseAmount: supplyBase,
        supplyGstAmount: supplyGst,
        supplyCount,
        erectionBilled: erectionBilled / 10000000,
        erectionBilledRaw: erectionBilled,
        erectionBaseAmount: erectionBase,
        erectionGstAmount: erectionGst,
        erectionCount,
        retentionBilled: 0,
        retentionBilledRaw: 0,
        retentionCount: 0,
        totalBillingCount: supplyCount + erectionCount,
        billingCircles,
        piValue: totalPIValue,
        piCount: piTotal,
        piQty: totalPIQty,
        woCount,
        totalWoValue: totalWoValue / 10000000,
        totalWoValueRaw: totalWoValue,
        poPending,
        poCleared
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
        handover: { completed: handoverCompleted, total: handoverTotal }
      }
    };

    ceoDashboardCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload, promise: null });
    return responsePayload;
  })();

  ceoDashboardCache.set(cacheKey, { timestamp: Date.now(), data: null, promise: fetchPromise });
  try {
    return await fetchPromise;
  } catch (err) {
    ceoDashboardCache.delete(cacheKey);
    throw err;
  }
};
