import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { buildStockSummaryData } from '../store/store.controller';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';

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
    .sort({ createdAt: -1 })
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

  const dashboardData = {
    summary: {
      totalStockValue,
      totalItemsInStock,
      pendingReceiptsCount,
      pendingVerificationCount
    },
    topStockedItems,
    lowStockItems,
    recentActivities: formattedRecentActivities
  };

  res.status(200).json(new ApiResponse(200, dashboardData, 'Dashboard summary fetched successfully'));
});
