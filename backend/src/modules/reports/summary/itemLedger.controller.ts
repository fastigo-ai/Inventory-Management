import { Request, Response } from 'express';
import { StoreInwardEntry } from '../../store/storeInwardEntry.schema';
import { ContractorAssignment } from '../../contractors/contractorAssignment.schema';
import { asyncHandler } from '../../../core/utils/asyncHandler';
import { ApiResponse } from '../../../core/utils/ApiResponse';
import Item from '../../items/item.model';
import mongoose from 'mongoose';

export const getItemLedger = asyncHandler(async (req: Request, res: Response) => {
  const { tempCode, itemName, circle, package: pkg } = req.query;

  if (!tempCode && !itemName) {
    return res.status(400).json(new ApiResponse(400, null, 'Temp Code or Item Name is required'));
  }

  let finalTempCode = tempCode;

  // If tempCode is missing but itemName is provided, find the tempCode
  if (!finalTempCode && itemName) {
    const item = await Item.findOne({ 'dynamicData.itemName': { $regex: itemName as string, $options: 'i' } });
    if (!item) {
       return res.status(200).json(new ApiResponse(200, { item: null, ledger: [], totalBalance: 0 }, 'Item not found'));
    }
    finalTempCode = item.dynamicData?.tempCode;
  }

  // Find the item details for context
  const itemFilters: any = { 'dynamicData.tempCode': finalTempCode };
  if (circle) {
    // Basic package resolution just in case we need it, though circle is usually sufficient
  }
  
  // We don't strictly need to find the item first, but it's good for the response header
  const item = await Item.findOne(itemFilters);

  // 1. Fetch Inward Entries (Receipts from Vendors)
  const inwardQuery: any = { tempCode: finalTempCode, status: { $in: ['APPROVED', 'VERIFIED'] } };
  if (circle) inwardQuery.circle = circle;
  if (pkg) inwardQuery.package = pkg;

  const inwards = await StoreInwardEntry.find(inwardQuery).sort({ receivedDate: 1, createdAt: 1 }).lean();

  // 2. Fetch Contractor Assignments (Issues to Contractors)
  // For assignments, the tempCode is inside the lineItems array.
  const assignmentQuery: any = { 
    status: { $ne: 'Cancelled' },
    'lineItems.tempCode': finalTempCode 
  };
  if (circle) {
    assignmentQuery.$or = [{ circle: circle }, { location: circle }];
  }

  const assignments = await ContractorAssignment.find(assignmentQuery).populate('contractorId', 'firmName').sort({ date: 1, createdAt: 1 }).lean();

  const ledgerEntries: any[] = [];

  // Map Inwards
  inwards.forEach(inward => {
    ledgerEntries.push({
      date: inward.receivedDate || inward.createdAt,
      type: 'IN',
      reference: inward.inwardId || inward.challanNumber || inward.invoiceNumber || 'Unknown Receipt',
      entityName: inward.vendorName || 'Unknown Vendor',
      quantity: inward.totalQty || inward.invoiceQty || 0,
      circle: inward.circle,
      package: inward.package
    });
  });

  // Map Issues
  assignments.forEach(assignment => {
    // Find the specific line item
    const lineItem = assignment.lineItems.find((li: any) => li.tempCode === tempCode);
    if (lineItem) {
      const contractorName = assignment.contractorFarmName || (assignment.contractorId as any)?.firmName || 'Unknown Contractor';
      ledgerEntries.push({
        date: assignment.date || assignment.createdAt,
        type: 'OUT',
        reference: assignment.assignmentNumber || assignment.minNo || 'Unknown Issue',
        entityName: contractorName,
        quantity: lineItem.quantity || lineItem.demandQty || 0,
        circle: assignment.circle || assignment.location,
        package: 'Package 1(S/N)' // Defaulting or fetch from assignment if exists
      });
    }
  });

  // Sort all entries chronologically
  ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate Running Balance
  let balance = 0;
  const computedLedger = ledgerEntries.map(entry => {
    if (entry.type === 'IN') {
      balance += entry.quantity;
    } else if (entry.type === 'OUT') {
      balance -= entry.quantity;
    }
    return {
      ...entry,
      balance
    };
  });

  res.status(200).json(new ApiResponse(200, {
    item: item ? { itemName: item.dynamicData?.itemName || item.name, tempCode, unit: item.dynamicData?.unit } : { tempCode },
    ledger: computedLedger,
    totalBalance: balance
  }, 'Item Ledger generated successfully'));
});
