import { Request, Response } from 'express';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { ApiError } from '../../core/utils/ApiError';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { DI } from './di.schema';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse/sync';
import { PurchaseOrder } from '../purchases/purchaseOrder.schema';
import { Pr } from '../purchases/pr.schema';
import mongoose from 'mongoose';
import { SummaryService } from '../reports/summary/summary.service';
import Item from '../items/item.model';
import { DocumentRelation } from '../../core/document-engine/relations/documentRelation.schema';
import { PurchaseInvoice } from '../purchases/purchaseInvoice.schema';
import { AllocationService } from '../../core/document-engine/allocation/allocation.service';
export const createDI = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;

  // Parse lineItems if they come as string from multipart/form-data
  let parsedLineItems = data.lineItems || [];
  if (typeof parsedLineItems === 'string') {
    try {
      parsedLineItems = JSON.parse(parsedLineItems);
    } catch (e) {
      parsedLineItems = [];
    }
  }

  // Process attachments
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const diLetterCopyUrl = files?.['diLetterCopyUrl']?.[0]?.filename ? `/uploads/dis/${files['diLetterCopyUrl'][0].filename}` : undefined;
  const inspectionReportCopyUrl = files?.['inspectionReportCopyUrl']?.[0]?.filename ? `/uploads/dis/${files['inspectionReportCopyUrl'][0].filename}` : undefined;
  
  const diData = {
    ...data,
    lineItems: parsedLineItems,
    diLetterCopyUrl,
    inspectionReportCopyUrl
  };
  
  // Basic validation
  if (!diData.diNumber || !diData.lineItems || diData.lineItems.length === 0) {
    throw new ApiError(400, 'DI Number and Line Items are required');
  }

  // Check if DI number already exists
  const existingDI = await DI.findOne({ diNumber: diData.diNumber });
  if (existingDI) {
    throw new ApiError(400, 'DI Number already exists');
  }

  // If purchaseOrderId is provided, look it up to populate missing fields
  if (diData.purchaseOrderId) {
    const po = await PurchaseOrder.findById(diData.purchaseOrderId);
    if (po) {
      if (!diData.vendorName) diData.vendorName = po.vendorName;
      if (!diData.poNumber) diData.poNumber = po.purchaseOrderNumber;
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [newDI] = await DI.create([diData], { session });

    // Update Item Summary (diQty)
    for (const item of newDI.lineItems) {
      if (!item.itemId) continue;
      await SummaryService.updateSummary({
        itemId: item.itemId.toString(),
        circle: item.circle || newDI.circle,
        package: item.package || newDI.package,
        increments: { diQty: item.quantity },
        session
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(
      new ApiResponse(201, newDI, 'DI Registered Successfully')
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const getDIs = asyncHandler(async (req: Request, res: Response) => {
  const { purchaseOrderId, status, diNumber, startDate, endDate, search } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const user = (req as any).user;
  const filter: any = {};
  
  if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
  if (status) filter.status = status;

  if (user && user.role?.name === 'Store Manager') {
    if (user.assignedPackage) filter.package = user.assignedPackage;
    if (user.assignedCircle) filter.circle = user.assignedCircle;
  }

  // Exact or regex match for diNumber
  if (diNumber) {
    filter.diNumber = { $regex: diNumber as string, $options: 'i' };
  }

  // Date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  // Search matches diNumber, poNumber, or vendorName
  if (search) {
    const searchRegex = { $regex: search as string, $options: 'i' };
    filter.$or = [
      { diNumber: searchRegex },
      { poNumber: searchRegex },
      { vendorName: searchRegex }
    ];
  }

  const isPaginated = req.query.page !== undefined;

  if (isPaginated) {
    const [dis, total, statusAggregation, matchingDIsForInsights, totalActiveDIs] = await Promise.all([
      DI.find(filter)
        .populate('purchaseOrderId', 'purchaseOrderNumber vendorName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DI.countDocuments(filter),
      DI.aggregate([
        { $match: {} }, // Global insights regardless of filter
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      DI.find({}).select('_id diNumber lineItems.quantity').lean(), // Global insights regardless of filter
      DI.countDocuments({}) // Total active DIs globally
    ]);
    
    const globalStatusCounts = statusAggregation.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Calculate global fulfillment & bar chart data
    const diIds = matchingDIsForInsights.map((d: any) => d._id);
    const globalPIs = await PurchaseInvoice.find({ 'lineItems.diId': { $in: diIds } }).select('lineItems').lean();
    
    let globalTotalOrdered = 0;
    let globalTotalConsumed = 0;
    
    const diFulfillmentMap = new Map<string, { ordered: number, consumed: number, diNumber: string }>();

    matchingDIsForInsights.forEach((d: any) => {
       const ordered = d.lineItems?.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0) || 0;
       globalTotalOrdered += ordered;
       diFulfillmentMap.set(d._id.toString(), { ordered, consumed: 0, diNumber: d.diNumber });
    });

    globalPIs.forEach(pi => {
       pi.lineItems?.forEach((line: any) => {
          if (line.diId) {
             const diIdStr = line.diId.toString();
             if (diFulfillmentMap.has(diIdStr)) {
                const qty = Number(line.quantity) || Number(line.invoiceQuantity) || 0;
                globalTotalConsumed += qty;
                const stats = diFulfillmentMap.get(diIdStr)!;
                stats.consumed += qty;
             }
          }
       });
    });

    const globalOverallProgress = globalTotalOrdered > 0 ? Math.round((globalTotalConsumed / globalTotalOrdered) * 100) : 0;
    
    const globalBarData = Array.from(diFulfillmentMap.values())
      .map(stats => ({
        name: stats.diNumber,
        Fulfillment: stats.ordered > 0 ? Math.round((stats.consumed / stats.ordered) * 100) : 0
      }))
      // Sort by fulfillment descending and take top 15 for the chart
      .sort((a, b) => b.Fulfillment - a.Fulfillment)
      .slice(0, 15);

    const enhancedDIs = await Promise.all(dis.map(async (di) => {
       const diObj = di.toObject();
       const totalOrdered = diObj.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
       
       const childRelations = await DocumentRelation.find({ sourceDocument: di._id, targetModule: 'PurchaseInvoice' }).lean();
       const piIds = childRelations.map((r: any) => r.targetDocument);
       const pis = await PurchaseInvoice.find({ _id: { $in: piIds } }).select('invoiceNumber status amount').lean();
       
       const allocations = await AllocationService.getDiAllocation(di._id.toString());
       const remainingMap = new Map();
       allocations.forEach((a: any) => remainingMap.set(a.lineId, a.remainingQuantity));
       
       let calculatedRemaining = 0;
       diObj.lineItems?.forEach((item: any) => {
         const rem = remainingMap.get(item._id.toString());
         calculatedRemaining += (rem !== undefined ? rem : (Number(item.quantity) || 0));
       });
       
       const totalConsumed = totalOrdered - calculatedRemaining;
       const progressPercent = totalOrdered > 0 ? Math.round((totalConsumed / totalOrdered) * 100) : 0;
       
       return {
         ...diObj,
         progressPercent,
         childInvoices: pis
       };
    }));

    res.status(200).json(
      new ApiResponse(200, {
        dis: enhancedDIs,
        insights: {
          statusCounts: globalStatusCounts,
          overallProgress: globalOverallProgress,
          barData: globalBarData,
          totalActiveDIs
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }, 'DIs fetched successfully')
    );
  } else {
    const dis = await DI.find(filter)
      .populate('purchaseOrderId', 'purchaseOrderNumber vendorName')
      .sort({ createdAt: -1 });

    const statusCounts = dis.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const enhancedDIs = await Promise.all(dis.map(async (di) => {
       const diObj = di.toObject();
       const totalOrdered = diObj.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
       
       const childRelations = await DocumentRelation.find({ sourceDocument: di._id, targetModule: 'PurchaseInvoice' }).lean();
       const piIds = childRelations.map((r: any) => r.targetDocument);
       const pis = await PurchaseInvoice.find({ _id: { $in: piIds } }).select('invoiceNumber status amount').lean();
       
       const allocations = await AllocationService.getDiAllocation(di._id.toString());
       const remainingMap = new Map();
       allocations.forEach((a: any) => remainingMap.set(a.lineId, a.remainingQuantity));
       
       let calculatedRemaining = 0;
       diObj.lineItems?.forEach((item: any) => {
         const rem = remainingMap.get(item._id.toString());
         calculatedRemaining += (rem !== undefined ? rem : (Number(item.quantity) || 0));
       });
       
       const totalConsumed = totalOrdered - calculatedRemaining;
       const progressPercent = totalOrdered > 0 ? Math.round((totalConsumed / totalOrdered) * 100) : 0;
       
       return {
         ...diObj,
         progressPercent,
         childInvoices: pis
       };
    }));

    res.status(200).json(
      new ApiResponse(200, {
        dis: enhancedDIs,
        insights: {
          statusCounts
        }
      }, 'DIs fetched successfully')
    );
  }
});

export const getDIById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const di = await DI.findById(id).populate('purchaseOrderId');
  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  const diObj = di.toObject();
  
  // Check if linked to PR
  const hasPr = await Pr.exists({ diNo: di.diNumber });
  (diObj as any).isLocked = di.status === 'Received' || !!hasPr;

  res.status(200).json(
    new ApiResponse(200, diObj, 'DI fetched successfully')
  );
});

export const updateDIStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const di = await DI.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  res.status(200).json(
    new ApiResponse(200, di, 'DI status updated successfully')
  );
});

export const receiveDI = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const di = await DI.findById(id);

  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  if (di.status === 'Received') {
    throw new ApiError(400, 'DI has already been received');
  }

  di.status = 'Received';
  await di.save();

  // In a full implementation, we would increment the inventory for the specific items here.
  // We'll leave the inventory adjustment logic stubbed out since inventory is metadata driven.

  res.status(200).json(
    new ApiResponse(200, di, 'DI Received Successfully')
  );
});

export const updateDI = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const existingDI = await DI.findById(id);
  if (!existingDI) {
    throw new ApiError(404, 'DI not found');
  }

  // Parse lineItems if they come as string from multipart/form-data
  let parsedLineItems = data.lineItems || [];
  if (typeof parsedLineItems === 'string') {
    try {
      parsedLineItems = JSON.parse(parsedLineItems);
    } catch (e) {
      parsedLineItems = [];
    }
  }

  // Process new attachments
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (files?.['diLetterCopyUrl']?.[0]) {
    existingDI.diLetterCopyUrl = `/uploads/dis/${files['diLetterCopyUrl'][0].filename}`;
  }
  if (files?.['inspectionReportCopyUrl']?.[0]) {
    existingDI.inspectionReportCopyUrl = `/uploads/dis/${files['inspectionReportCopyUrl'][0].filename}`;
  }

  // Check if locked
  const hasPr = await Pr.exists({ diNo: existingDI.diNumber });
  const isLocked = existingDI.status === 'Received' || !!hasPr;

  // Get unique item ids from before and after update
  const oldItemIds = existingDI.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);
  const newItemIds = parsedLineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);
  const allAffectedItemIds = Array.from(new Set([...oldItemIds, ...newItemIds]));

  if (isLocked) {
    // If locked, we ONLY allow updating notes or attachments (already processed above)
    if (data.notes !== undefined) existingDI.notes = data.notes;
    // Disallow line items, status changes, etc.
  } else {
    // Not locked, allow full update
    if (data.status) existingDI.status = data.status;
    if (data.notes !== undefined) existingDI.notes = data.notes;
    if (data.vendorName !== undefined) existingDI.vendorName = data.vendorName;
    if (data.poNumber !== undefined) existingDI.poNumber = data.poNumber;
    if (data.purchaseOrderId !== undefined) existingDI.purchaseOrderId = data.purchaseOrderId || undefined;
    existingDI.lineItems = parsedLineItems;
  }

  const updatedDI = await existingDI.save();

  for (const id of allAffectedItemIds) {
    SummaryService.rebuildForItem(id).catch(console.error);
  }

  res.status(200).json(
    new ApiResponse(200, updatedDI, 'DI Updated Successfully')
  );
});

export const importDIs = asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const parser = parseAndSanitizeCsv(req.file.buffer);
    const rows: Record<string, string>[] = [];
    const tempCodes = new Set<string>();
    const loaSerialNos = new Set<string>();
    const itemNames = new Set<string>();

    for await (const r of parser) {
      const row = r as Record<string, string>;
      rows.push(row);

      const tempCode = row['TempCode'] || row['tempCode'];
      const loaSerialNo = row['LoaSerialNo'] || row['loaSerialNo'];
      const itemName = row['ItemName'] || row['itemName'] || row['Item Name'];

      if (tempCode) tempCodes.add(tempCode);
      if (loaSerialNo) loaSerialNos.add(loaSerialNo);
      if (itemName) itemNames.add(itemName);
    }

    // 1. Bulk pre-fetch matching items
    const orConditions: any[] = [];
    if (tempCodes.size > 0) orConditions.push({ 'dynamicData.tempCode': { $in: Array.from(tempCodes) } });
    if (loaSerialNos.size > 0) {
      const serials = Array.from(loaSerialNos);
      orConditions.push({ 'dynamicData.loaSerialNo': { $in: serials } });
      orConditions.push({ 'dynamicData.loaSerialNumber': { $in: serials } });
      orConditions.push({ 'dynamicData.sku': { $in: serials } });
    }
    if (itemNames.size > 0) orConditions.push({ 'dynamicData.name': { $in: Array.from(itemNames) } });

    const existingItems = orConditions.length > 0 ? await Item.find({ $or: orConditions }) : [];

    const findItemInMemory = (tCode?: string, lSerial?: string, name?: string) => {
      if (tCode) {
        const found = existingItems.find(i => i.dynamicData?.tempCode === tCode);
        if (found) return found;
      }
      if (lSerial) {
        const found = existingItems.find(i => 
          i.dynamicData?.loaSerialNo === lSerial || 
          i.dynamicData?.loaSerialNumber === lSerial || 
          i.dynamicData?.sku === lSerial
        );
        if (found) return found;
      }
      if (name) {
        const found = existingItems.find(i => i.dynamicData?.name === name);
        if (found) return found;
      }
      return null;
    };

    // 2. Build disMap in-memory
    const disMap: Record<string, any> = {};

    for (const row of rows) {
      const diNumber = row['DINumber'] || row['diNumber'] || row['DI Number'];
      if (!diNumber) continue;

      const parseCsvDate = (dStr?: string) => {
        if (!dStr) return new Date().toISOString().split('T')[0];
        let cleaned = dStr.replace(/\.+/g, '.').trim(); // fix double dots
        const parts = cleaned.split(/[.\-\/]/);
        if (parts.length === 3) {
          // If DD.MM.YYYY
          if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        const p = new Date(dStr);
        if (!isNaN(p.getTime())) return p.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
      };

      if (!disMap[diNumber]) {
        disMap[diNumber] = {
          diNumber,
          _poNumber: row['PurchaseOrderNumber'] || row['purchaseOrderNumber'] || '',
          vendorName: row['VendorName'] || row['vendorName'] || row['Vendor Name'] || '',
          date: parseCsvDate(row['Date'] || row['date']),
          circle: row['Circle'] || row['circle'],
          package: row['Package'] || row['package'],
          status: row['Status'] || row['status'] || 'Active',
          notes: row['Notes'] || row['notes'],
          lineItems: [],
        };
      }

      const itemName = row['ItemName'] || row['itemName'] || row['Item Name'];
      const quantity = Number(row['Quantity'] || row['quantity'] || 0);
      const tempCode = row['TempCode'] || row['tempCode'];
      const loaSerialNo = row['LoaSerialNo'] || row['loaSerialNo'];
      const itemPackage = row['ItemPackage'] || row['itemPackage'] || row['Package'] || row['package'];
      const itemCircle = row['ItemCircle'] || row['itemCircle'] || row['Circle'] || row['circle'];
      const unit = row['Unit'] || row['unit'] || row['Unit Name'];

      if (itemName) {
        const item = findItemInMemory(tempCode, loaSerialNo, itemName);
        const itemId = item ? item._id : null;

        disMap[diNumber].lineItems.push({
          itemId,
          itemName,
          tempCode,
          loaSerialNo,
          package: itemPackage,
          circle: itemCircle,
          unit,
          quantity
        });
      }
    }

    // 4. Pre-fetch existing DIs, POs, and PRs to avoid sequential DB lookups in the loop
    const diNumbers = Object.keys(disMap);
    const poNumbers = Array.from(new Set(diNumbers.map(n => disMap[n]._poNumber).filter(Boolean)));

    const [existingDIs, existingPOs] = await Promise.all([
      DI.find({ diNumber: { $in: diNumbers } }),
      poNumbers.length > 0 ? PurchaseOrder.find({ purchaseOrderNumber: { $in: poNumbers } }) : []
    ]);

    // Use Pr dynamically imported model since it might not be strictly typed at the top
    const { Pr } = await import('../purchases/pr.schema');
    const existingPrs = await Pr.find({ diNo: { $in: existingDIs.map(d => d.diNumber) } }, { diNo: 1 });
    const prDiNumbers = new Set(existingPrs.map((pr: any) => pr.diNo));

    let successCount = 0;
    const errors: any[] = [];
    const globalAffectedItemIds = new Set<string>();
    
    for (const diNumber of diNumbers) {
      const diData = disMap[diNumber];
      try {
        const existing = existingDIs.find(d => d.diNumber === diData.diNumber);

        if (diData._poNumber) {
          const po = existingPOs.find(p => p.purchaseOrderNumber === diData._poNumber);
          if (po) {
            diData.purchaseOrderId = po._id;
            if (!diData.vendorName) {
              diData.vendorName = po.vendorName;
            }
          } else {
            errors.push(`Purchase Order ${diData._poNumber} not found for DI ${diData.diNumber}. It will be created without PO link.`);
          }
        }
        delete diData._poNumber;

        if (existing) {
          const hasPr = prDiNumbers.has(existing.diNumber);
          const isLocked = existing.status === 'Received' || hasPr;
          if (isLocked) {
            errors.push(`DI ${diData.diNumber} already exists and is locked (Received or Invoiced). Cannot update.`);
            continue;
          }

          const oldItemIds = existing.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);

          existing.date = diData.date;
          if (diData.circle) existing.circle = diData.circle;
          if (diData.package) existing.package = diData.package;
          if (diData.status) existing.status = diData.status;
          if (diData.notes !== undefined) existing.notes = diData.notes;
          if (diData.vendorName) existing.vendorName = diData.vendorName;
          if (diData.purchaseOrderId) existing.purchaseOrderId = diData.purchaseOrderId;
          const mergedItems = [...existing.lineItems];
          for (const newItem of diData.lineItems) {
            const matchIdx = mergedItems.findIndex((li: any) => 
              ((newItem.itemId && li.itemId && newItem.itemId.toString() === li.itemId.toString()) ||
               (li.itemName === newItem.itemName && li.loaSerialNo === newItem.loaSerialNo)) &&
              (li.circle === newItem.circle) &&
              (li.package === newItem.package)
            );

            if (matchIdx > -1) {
              mergedItems[matchIdx].quantity = newItem.quantity;
              if (newItem.tempCode) mergedItems[matchIdx].tempCode = newItem.tempCode;
              if (newItem.unit) mergedItems[matchIdx].unit = newItem.unit;
            } else {
              mergedItems.push(newItem);
            }
          }
          existing.lineItems = mergedItems;

          const updated = await existing.save();
          successCount++;

          const allAffectedItemIds = Array.from(new Set([
            ...oldItemIds,
            ...updated.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean)
          ]));
          allAffectedItemIds.forEach(id => globalAffectedItemIds.add(id));

        } else {
          const createdDI = await DI.create(diData);
          successCount++;
          
          for (const line of createdDI.lineItems) {
            if (line.itemId) globalAffectedItemIds.add(line.itemId.toString());
          }
        }
      } catch (err: any) {
        errors.push(`Failed to import DI ${diData.diNumber}: ${err.message}`);
      }
    }

    // Process all rebuilds at the end to prevent Node/MongoDB connection pool starvation
    // Wrapped in setTimeout to ensure the HTTP response flushes before massive aggregation queries start
    const uniqueItemIds = Array.from(globalAffectedItemIds);
    setTimeout(() => {
      (async () => {
        for (let i = 0; i < uniqueItemIds.length; i += 10) {
          const chunk = uniqueItemIds.slice(i, i + 10);
          await Promise.all(chunk.map(id => SummaryService.rebuildForItem(id).catch(console.error)));
        }
      })();
    }, 1000);

    res.status(200).json({
      success: true,
      message: 'Import processed',
      data: {
        successCount,
        errors
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to import DI Registrations',
      error: error.message,
    });
  }
});

export const deleteDI = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const di = await DI.findById(id);
  if (!di) {
    throw new ApiError(404, 'DI not found');
  }

  const hasPr = await Pr.exists({ diNo: di.diNumber });
  if (di.status === 'Received' || hasPr) {
    throw new ApiError(400, 'Cannot delete this DI because it has already been Received or Invoiced.');
  }

  const itemIds = di.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);
  await DI.findByIdAndDelete(id);

  for (const itemId of itemIds) {
    if (itemId) SummaryService.rebuildForItem(itemId).catch(console.error);
  }

  res.status(200).json(
    new ApiResponse(200, null, 'DI deleted successfully')
  );
});
