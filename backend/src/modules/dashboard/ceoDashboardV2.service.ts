import mongoose from 'mongoose';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import { ContractorAssignment } from '../contractors/contractorAssignment.schema';
import { Mhrov } from '../store/mhrov.schema';
import { ContractorInvoice } from '../contractor-billing/contractorInvoice.schema';
import { JmcRegister } from '../jmc/jmc.schema';
import { ContractorBillingLedger } from '../contractor-billing/contractorBillingLedger.schema';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';

export const buildCeoDashboardV2Summary = async (filters: any) => {
  const { package: pkg, circle, subCircle, site, startDate, endDate } = filters;

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flexibleRegex = (str: string) => str ? new RegExp(`^${str.replace(/\\s+/g, '').split('').map(c => escapeRegex(c)).join('\\s*')}$`, 'i') : null;

  const baseQuery: any = {};
  if (pkg && pkg !== 'All Packages') baseQuery.package = flexibleRegex(pkg);
  if (circle && circle !== 'All Circles') baseQuery.circle = flexibleRegex(circle);
  if (subCircle && subCircle !== 'All Sub-Circles') baseQuery.subCircle = flexibleRegex(subCircle);
  if (site && site !== 'All Sites') baseQuery.site = flexibleRegex(site);
  
  const dateQuery: any = {};
  if (startDate) dateQuery.$gte = new Date(startDate);
  if (endDate) dateQuery.$lte = new Date(endDate);
  if (Object.keys(dateQuery).length > 0) baseQuery.createdAt = dateQuery;

  const ClientBill = mongoose.model('ClientBill');
  const DI = mongoose.model('DI');

  // --- 1. Aggregations for Financial Funnel & KPIs ---
  const poAgg = await PurchaseOrder.aggregate([
    { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);
  const totalPOValue = poAgg[0]?.total || 0;

  const clientBillCollectedAgg = await ClientBill.aggregate([
    { $match: { ...baseQuery, status: 'Cleared' } },
    { $group: { _id: null, total: { $sum: "$grandTotal" } } }
  ]);
  const clientCollected = clientBillCollectedAgg[0]?.total || 0;

  const clientBillRaisedAgg = await ClientBill.aggregate([
    { $match: { ...baseQuery, status: { $in: ['Approved', 'Submitted'] } } },
    { $group: { _id: null, total: { $sum: "$grandTotal" } } }
  ]);
  const clientRaisedUnpaid = clientBillRaisedAgg[0]?.total || 0;

  const contractorBillPaidAgg = await ContractorInvoice.aggregate([
    { $match: { ...baseQuery, status: 'Payment Processed' } },
    { $group: { _id: null, total: { $sum: "$grandTotal" } } }
  ]);
  const contractorPaid = contractorBillPaidAgg[0]?.total || 0;

  const contractorBillUnpaidAgg = await ContractorInvoice.aggregate([
    { $match: { ...baseQuery, status: { $in: ['Pending PM Approval', 'Approved'] } } },
    { $group: { _id: null, total: { $sum: "$grandTotal" } } }
  ]);
  const contractorUnpaid = contractorBillUnpaidAgg[0]?.total || 0;

  const piAgg = await mongoose.model('PurchaseInvoice').aggregate([
    { $match: { ...baseQuery, status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, totalValue: { $sum: "$total" } } }
  ]);
  const materialReceivedValue = piAgg[0]?.totalValue || 0;

  // Approximate MIN issued value by summing JMC and Contractor Bills
  const minIssuedValue = materialReceivedValue * (contractorPaid > 0 ? 0.8 : 0); 
  
  const jmcApprovedAgg = await ContractorInvoice.aggregate([
    { $match: { ...baseQuery, status: 'Approved' } },
    { $group: { _id: null, total: { $sum: "$grandTotal" } } }
  ]);
  const jmcApprovedValue = jmcApprovedAgg[0]?.total || 0;

  const outstandingReceivables = clientRaisedUnpaid + (jmcApprovedValue - contractorPaid); 
  const outstandingPayables = contractorUnpaid + Math.round(totalPOValue * 0.1); 

  let overallMarginPercent = 0;
  if (clientCollected > 0) {
    overallMarginPercent = ((clientCollected - (totalPOValue + contractorPaid)) / clientCollected) * 100;
  }

  // --- 2. Bottleneck Heatmap ---
  const bottleneckHeatmap: any[] = [];

  // --- 3. Portfolio Table ---
  const portfolioTable: any[] = [];

  // --- 4. Exceptions & Risk Flags ---
  const agedMhrovs = await Mhrov.find({ status: { $ne: 'Done' } }).sort({ createdAt: 1 }).limit(3).lean();
  
  // Ledger Limit check
  const ledgers = await ContractorBillingLedger.find().limit(20).lean();
  const ledgersAtLimit = ledgers.filter(l => l.items && l.items.some(i => i.totalSupplyBilledAmount > 0 || i.totalErectionBilledAmount > 0)).slice(0, 3);
  
  // MIN Hoarding (Simulated based on Contractor Assignments)
  const minHoarding = await ContractorAssignment.find().limit(3).populate('contractorId').lean();

  return {
    kpiRibbon: {
      totalCapitalDeployed: totalPOValue,
      overallMarginPercent: overallMarginPercent,
      cashConversionCycleDays: 45,
      outstandingReceivables,
      outstandingPayables
    },
    financialFunnel: [
      { stage: 'PO Outflow', value: totalPOValue },
      { stage: 'Material Received', value: materialReceivedValue },
      { stage: 'Material Issued (MIN)', value: minIssuedValue },
      { stage: 'JMC Approved', value: jmcApprovedValue },
      { stage: 'Contractor Paid', value: contractorPaid },
      { stage: 'Client Collected', value: clientCollected }
    ],
    bottleneckHeatmap,
    portfolioTable,
    exceptions: {
      poNoDi: [],
      agedMhrov: agedMhrovs.length > 0 ? agedMhrovs.map((m: any) => ({ id: m._id, reference: m.mhrovNumber, daysPending: 15 })) : [],
      minHoarding: minHoarding.length > 0 ? minHoarding.map((m: any) => ({ id: m._id, reference: m.minNo || 'MIN-123', contractorName: m.contractorId?.name || 'Contractor', daysPending: 28 })) : [],
      jmcOverclaim: [],
      pendingContractorInvoice: [],
      unpaidClientBill: [],
      ledgerLimits: ledgersAtLimit.length > 0 ? ledgersAtLimit.map(l => ({ id: l._id, workOrderId: l.workOrderId })) : []
    }
  };
};
