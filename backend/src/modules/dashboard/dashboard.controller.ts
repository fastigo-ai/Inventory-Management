import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { buildStockSummaryData } from '../store/store.controller';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { ContractorInvoice } from '../contractor-billing/contractorInvoice.schema';
export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  // 1. Fetch real-time stock summary (this is heavy but accurate)
  const stockSummary = await buildStockSummaryData();

  // Aggregate metrics
  let totalStockValue = 0;
  let totalItemsInStock = 0;

  // For top stocked and low stock
  const stockList = [...stockSummary].filter((item: any) => item.totalBalanceQty > 0);
  
  stockList.forEach((item: any) => {
    const rate = parseFloat(item.rate) || 0;
    const stockValue = rate * item.totalBalanceQty;
    totalStockValue += stockValue;
    totalItemsInStock += 1;
  });

  // Sort by quantity descending for Top 5
  const topStockedItems = [...stockList]
    .sort((a, b) => b.totalBalanceQty - a.totalBalanceQty)
    .slice(0, 5)
    .map(item => ({
      name: item.description,
      quantity: item.totalBalanceQty,
      value: (parseFloat(item.rate) || 0) * item.totalBalanceQty
    }));

  // Sort by quantity ascending for Low Stock (e.g., lowest 5 items that are not 0)
  const lowStockItems = [...stockList]
    .sort((a, b) => a.totalBalanceQty - b.totalBalanceQty)
    .slice(0, 5)
    .map(item => ({
      name: item.description,
      quantity: item.totalBalanceQty
    }));

  // 2. Pending Actions (Count of Inwards stuck in PENDING_RECEIPT)
  const pendingReceiptsCount = await StoreInwardEntry.countDocuments({ status: 'PENDING_RECEIPT' });
  const pendingVerificationCount = await StoreInwardEntry.countDocuments({ status: 'VERIFIED' });

  // 3. Recent Activity (Latest 5 GRNs/Inwards)
  const recentActivities = await StoreInwardEntry.find()
    .sort({ createdAt: 1 })
    .limit(5)
    .populate('createdBy', 'firstName lastName')
    .select('diId status createdAt createdBy');

  const formattedRecentActivities = recentActivities.map(entry => ({
    id: entry._id,
    reference: entry.diId?.toString() || 'Manual GRN',
    status: entry.status,
    date: entry.createdAt,
    // @ts-ignore
    user: entry.createdBy ? `${entry.createdBy.firstName} ${entry.createdBy.lastName}` : 'System'
  }));

  // 4. Executive Financials
  const poSpendResult = await PurchaseOrder.aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, totalSpend: { $sum: '$total' } } }
  ]);
  const totalProcurementSpend = poSpendResult[0]?.totalSpend || 0;

  const contractorLiabilitiesResult = await ContractorInvoice.aggregate([
    { $match: { status: { $in: ['Approved', 'Submitted'] } } },
    { $group: { _id: null, totalLiabilities: { $sum: '$grandTotal' } } }
  ]);
  const totalContractorLiabilities = contractorLiabilitiesResult[0]?.totalLiabilities || 0;

  const dashboardData = {
    summary: {
      totalStockValue,
      totalItemsInStock,
      pendingReceiptsCount,
      pendingVerificationCount,
      totalProcurementSpend,
      totalContractorLiabilities
    },
    topStockedItems,
    lowStockItems,
    recentActivities: formattedRecentActivities
  };

  res.status(200).json(new ApiResponse(200, dashboardData, 'Dashboard summary fetched successfully'));
});

export const getSitePortalDashboardSummary = asyncHandler(async (req: any, res: Response) => {
  const user = req.user;
  if (!user.assignedPackage || !user.assignedCircle) {
    return res.status(400).json(new ApiResponse(400, null, 'User is missing assigned package or circle'));
  }

  const { assignedPackage, assignedCircle } = user;
  const { contractorId, tempCode } = req.query;

  // 1. Fetch JMC Data
  const JmcRegister = mongoose.model('JmcRegister');
  const WipRegister = mongoose.model('WipRegister');
  const DemandNote = mongoose.model('DemandNote');
  const Mhrov = mongoose.model('Mhrov');
  const Contractor = mongoose.model('Contractor');

  // Build query for JMC and WIP
  const baseQuery: any = { package: assignedPackage, circle: assignedCircle };
  if (contractorId) {
    baseQuery.contractorId = contractorId;
  }

  const jmcs = await JmcRegister.find(baseQuery).populate('contractorId', 'dynamicData');
  const wips = await WipRegister.find(baseQuery).populate('contractorId', 'dynamicData');

  // Metrics
  let totalJmcQty = 0;
  let totalWipQty = 0;
  const contractorStats: Record<string, { contractor: string, jmcQty: number, wipQty: number }> = {};
  const itemStats: Record<string, { item: string, jmcQty: number, wipQty: number }> = {};
  const availableTempCodes = new Set<string>();

  jmcs.forEach(jmc => {
    const cName = jmc.contractorId?.dynamicData?.displayName || 'Unknown';
    if (!contractorStats[cName]) contractorStats[cName] = { contractor: cName, jmcQty: 0, wipQty: 0 };
    
    jmc.items.forEach((item: any) => {
      if (item.tempCode) availableTempCodes.add(item.tempCode);
      if (tempCode && item.tempCode !== tempCode) return;

      const qty = (Number(item.claimedQty) || 0) + (Number(item.approvedQty) || 0);
      totalJmcQty += qty;
      contractorStats[cName].jmcQty += qty;

      const itemName = item.description || item.activity || item.tempCode || 'Unknown';
      if (!itemStats[itemName]) itemStats[itemName] = { item: itemName, jmcQty: 0, wipQty: 0 };
      itemStats[itemName].jmcQty += qty;
    });
  });

  wips.forEach(wip => {
    const cName = wip.contractorId?.dynamicData?.displayName || 'Unknown';
    if (!contractorStats[cName]) contractorStats[cName] = { contractor: cName, jmcQty: 0, wipQty: 0 };
    
    wip.items.forEach((item: any) => {
      if (item.tempCode) availableTempCodes.add(item.tempCode);
      if (tempCode && item.tempCode !== tempCode) return;

      const qty = (Number(item.claimedQty) || 0) + (Number(item.approvedQty) || 0);
      totalWipQty += qty;
      contractorStats[cName].wipQty += qty;

      const itemName = item.description || item.activity || item.tempCode || 'Unknown';
      if (!itemStats[itemName]) itemStats[itemName] = { item: itemName, jmcQty: 0, wipQty: 0 };
      itemStats[itemName].wipQty += qty;
    });
  });

  // Demand Notes Filter
  const dnQuery: any = { package: assignedPackage, circle: assignedCircle };
  if (contractorId) {
    const c = await Contractor.findById(contractorId);
    if (c) dnQuery.contractorName = c.dynamicData?.displayName || c.dynamicData?.companyName;
  }
  if (tempCode) {
    dnQuery['items.tempCode'] = tempCode;
  }

  const totalDemandNotes = await DemandNote.countDocuments(dnQuery);
  const approvedDemandNotes = await DemandNote.countDocuments({ ...dnQuery, status: 'Approved' });

  // MHROV Filter (Not filtering by contractor/tempCode to keep it general for the package, unless specified later)
  const totalMhrovs = await Mhrov.countDocuments({ package: assignedPackage, circle: assignedCircle });

  res.status(200).json(new ApiResponse(200, {
    totalJmcQty,
    totalWipQty,
    contractorData: Object.values(contractorStats),
    itemData: Object.values(itemStats).sort((a, b) => (b.jmcQty + b.wipQty) - (a.jmcQty + a.wipQty)).slice(0, 10), // Top 10 items
    availableTempCodes: Array.from(availableTempCodes),
    metrics: {
      totalDemandNotes,
      approvedDemandNotes,
      totalMhrovs
    }
  }, 'Site Portal Dashboard Data'));
});
