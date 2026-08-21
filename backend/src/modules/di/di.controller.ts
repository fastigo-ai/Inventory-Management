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
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import { AllocationService } from '../../core/document-engine/allocation/allocation.service';

async function getDiLifecycleState(di: any) {
  const [invoices, inwards] = await Promise.all([
    PurchaseInvoice.find({ diNumber: di.diNumber }).lean(),
    StoreInwardEntry.find({ diId: di._id }).lean()
  ]);

  const hasDownstream = invoices.length > 0 || inwards.length > 0;
  if (!hasDownstream) return { state: 'DRAFT', invoicesCount: 0, inwardsCount: 0, itemBilledMap: new Map() };

  const itemBilledMap = new Map();
  
  for (const inv of invoices) {
    for (const li of (inv as any).lineItems || []) {
      const id = li.itemId?.toString();
      if (id) {
        itemBilledMap.set(id, (itemBilledMap.get(id) || 0) + (li.quantity || 0));
      }
    }
  }

  let allFullyBilled = true;
  if (!di.lineItems || di.lineItems.length === 0) {
    allFullyBilled = false;
  } else {
    for (const li of di.lineItems) {
      const id = li.itemId?.toString();
      const billed = id ? itemBilledMap.get(id) || 0 : 0;
      if (billed < (li.quantity || 0)) {
        allFullyBilled = false;
        break;
      }
    }
  }

  return {
    state: allFullyBilled ? 'FULLY_INVOICED' : 'PARTIALLY_INVOICED',
    invoicesCount: invoices.length,
    inwardsCount: inwards.length,
    itemBilledMap
  };
}

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
  
  // Auto-populate unit from Master Item if unit is missing
  const itemIdsToFetch = parsedLineItems.filter((li: any) => li.itemId && !li.unit).map((li: any) => li.itemId);
  if (itemIdsToFetch.length > 0) {
    const fetchedItems = await Item.find({ _id: { $in: itemIdsToFetch } });
    for (const li of parsedLineItems) {
      if (li.itemId && !li.unit) {
        const found = fetchedItems.find((it: any) => it._id.toString() === li.itemId.toString());
        if (found?.dynamicData) {
          li.unit = found.dynamicData.unit || 
                    found.dynamicData.Unit || 
                    found.dynamicData.uom || 
                    found.dynamicData.UOM || 
                    found.dynamicData.unitName || 
                    found.dynamicData['Unit Name'] || 
                    found.dynamicData.unitOfMeasurement || 
                    found.dynamicData['Unit of Measurement'] || 
                    '';
        }
      }
    }
  }

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
    const [dis, total] = await Promise.all([
      DI.find(filter)
        .populate('purchaseOrderId', 'purchaseOrderNumber vendorName')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DI.countDocuments(filter)
    ]);

    const enhancedDIs = await Promise.all(dis.map(async (diObj: any) => {
       const totalOrdered = diObj.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
       
       const childRelations = await DocumentRelation.find({ sourceDocument: diObj._id, targetModule: 'PurchaseInvoice' }).lean();
       const piIds = childRelations.map((r: any) => r.targetDocument);
       const pis = await PurchaseInvoice.find({ _id: { $in: piIds } }).select('invoiceNumber status amount').lean();
       
       const allocations = await AllocationService.getDiAllocation(diObj._id.toString());
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
      .sort({ createdAt: 1 })
      .lean();

    const enhancedDIs = await Promise.all(dis.map(async (diObj: any) => {
       const totalOrdered = diObj.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
       
       const childRelations = await DocumentRelation.find({ sourceDocument: diObj._id, targetModule: 'PurchaseInvoice' }).lean();
       const piIds = childRelations.map((r: any) => r.targetDocument);
       const pis = await PurchaseInvoice.find({ _id: { $in: piIds } }).select('invoiceNumber status amount').lean();
       
       const allocations = await AllocationService.getDiAllocation(diObj._id.toString());
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
        dis: enhancedDIs
      }, 'DIs fetched successfully')
    );
  }
});

export const getDIInsights = asyncHandler(async (req: Request, res: Response) => {
  const [statusAggregation, matchingDIsForInsights, totalActiveDIs] = await Promise.all([
    DI.aggregate([
      { $match: {} }, // Global insights
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    DI.find({}).select('_id diNumber lineItems.quantity').lean(),
    DI.countDocuments({})
  ]);
  
  const globalStatusCounts = statusAggregation.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

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
    .sort((a, b) => b.Fulfillment - a.Fulfillment)
    .slice(0, 15);

  res.status(200).json(
    new ApiResponse(200, {
      insights: {
        statusCounts: globalStatusCounts,
        overallProgress: globalOverallProgress,
        barData: globalBarData,
        totalActiveDIs
      }
    }, 'DI insights fetched successfully')
  );
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

  // Check Lifecycle State
  const lifecycle = await getDiLifecycleState(existingDI);

  // Get unique item ids from before and after update
  const oldItemIds = existingDI.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);
  const newItemIds = parsedLineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);
  const allAffectedItemIds = Array.from(new Set([...oldItemIds, ...newItemIds]));

  if (lifecycle.state === 'FULLY_INVOICED') {
    // If FULLY_INVOICED, we ONLY allow updating notes or attachments (already processed above)
    if (data.notes !== undefined) existingDI.notes = data.notes;
    // Disallow line items, status changes, etc.
  } else if (lifecycle.state === 'PARTIALLY_INVOICED') {
    // Block vendor, diNumber (which isn't updated anyway here, but let's be sure), and line items that are billed
    if (data.notes !== undefined) existingDI.notes = data.notes;
    if (data.status) existingDI.status = data.status;
    
    // Ensure vendorName and diNumber are not changed
    if (data.vendorName && data.vendorName !== existingDI.vendorName) {
      throw new ApiError(400, 'Cannot change Vendor Name because this DI is partially invoiced/received.');
    }

    // Validate line items
    // Block reducing quantity below already billed quantity
    // Block deleting invoiced line items
    for (const oldLi of existingDI.lineItems) {
      const itemIdStr = oldLi.itemId?.toString();
      const billedQty = itemIdStr ? lifecycle.itemBilledMap.get(itemIdStr) || 0 : 0;
      
      if (billedQty > 0) {
        // Find it in parsedLineItems
        const newLi = parsedLineItems.find((li: any) => li.itemId?.toString() === itemIdStr);
        if (!newLi) {
          throw new ApiError(400, `Cannot delete item '${oldLi.itemName}' because ${billedQty} units have already been invoiced or received.`);
        }
        if (Number(newLi.quantity) < billedQty) {
          throw new ApiError(400, `Cannot reduce quantity of '${oldLi.itemName}' below ${billedQty} because it has already been invoiced or received.`);
        }
      }
    }
    existingDI.lineItems = parsedLineItems;
  } else {
    // DRAFT / UNLINKED: Not locked, allow full update
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

    const findItemInMemory = (tCode?: string, lSerial?: string, name?: string, pkg?: string, circle?: string) => {
      const matchCriteria = (i: any) => {
        if (pkg && i.dynamicData?.package && i.dynamicData.package.toLowerCase() !== pkg.toLowerCase()) return false;
        if (circle && i.dynamicData?.circle && i.dynamicData.circle.toLowerCase() !== circle.toLowerCase()) return false;
        return true;
      };

      // 1. Highest specificity: LOA Serial No + Package + Circle
      if (lSerial) {
        const found = existingItems.find(i => 
          (i.dynamicData?.loaSerialNo === lSerial || 
           i.dynamicData?.loaSerialNumber === lSerial || 
           i.dynamicData?.sku === lSerial) && matchCriteria(i)
        );
        if (found) return found;
      }
      // 2. Temp Code + Package + Circle
      if (tCode) {
        const found = existingItems.find(i => i.dynamicData?.tempCode === tCode && matchCriteria(i));
        if (found) return found;
      }
      // 3. Name + Package + Circle
      if (name) {
        const found = existingItems.find(i => i.dynamicData?.name?.toLowerCase() === name.toLowerCase() && matchCriteria(i));
        if (found) return found;
      }

      // Fallback matching without strict package/circle requirement
      if (lSerial) {
        const found = existingItems.find(i => 
          i.dynamicData?.loaSerialNo === lSerial || 
          i.dynamicData?.loaSerialNumber === lSerial || 
          i.dynamicData?.sku === lSerial
        );
        if (found) return found;
      }
      if (tCode) {
        const found = existingItems.find(i => i.dynamicData?.tempCode === tCode);
        if (found) return found;
      }
      if (name) {
        const found = existingItems.find(i => i.dynamicData?.name?.toLowerCase() === name.toLowerCase());
        if (found) return found;
      }
      return null;
    };

    // 2. Build disMap in-memory
    const disMap: Record<string, any> = {};
    const errors: any[] = [];

    for (const row of rows) {
      const diNumber = row['DINumber'] || row['diNumber'] || row['DI Number'];
      if (!diNumber) continue;

      const parseCsvDate = (dStr?: string): Date => {
        if (!dStr) return new Date();
        let cleaned = dStr.replace(/\.+/g, '.').trim();
        const parts = cleaned.split(/[.\-\/]/);
        if (parts.length === 3) {
          if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
            const d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
            if (!isNaN(d.getTime())) return d;
          }
        }
        const p = new Date(dStr);
        if (!isNaN(p.getTime())) return p;
        return new Date();
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
      let unit = row['Unit'] || row['unit'] || row['Unit Name'] || row['unitName'] || row['UOM'] || row['uom'];

      if (itemName || tempCode || loaSerialNo) {
        const item = findItemInMemory(tempCode, loaSerialNo, itemName, itemPackage, itemCircle);
        const itemId = item ? item._id : null;

        if (!itemId && itemName) {
          errors.push(`Row error in DI ${diNumber}: Item '${itemName}' (TempCode: '${tempCode}', LoaSerialNo: '${loaSerialNo}') was not found in the master item list.`);
        }

        // Auto-fetch unit from master item if unit is missing or empty in the CSV row
        if (!unit && item?.dynamicData) {
          unit = item.dynamicData.unit || 
                 item.dynamicData.Unit || 
                 item.dynamicData.uom || 
                 item.dynamicData.UOM || 
                 item.dynamicData.unitName || 
                 item.dynamicData['Unit Name'] || 
                 item.dynamicData.unitOfMeasurement || 
                 item.dynamicData['Unit of Measurement'] || 
                 item.dynamicData.measurementUnit ||
                 item.dynamicData['Measurement Unit'] ||
                 '';
        }

        const finalUnit = unit || (item ? (item.dynamicData?.unit || item.unit || 'Nos') : 'Nos');
        const resolvedItemName = item ? (item.dynamicData?.name || item.name || itemName) : (itemName || 'Unknown Item');
        const resolvedTempCode = tempCode || item?.dynamicData?.tempCode || '';
        const resolvedLoaSerialNo = loaSerialNo || item?.dynamicData?.loaSerialNo || item?.dynamicData?.loaSerialNumber || item?.dynamicData?.sku || '';

        const existingLineIndex = disMap[diNumber].lineItems.findIndex((li: any) => 
          ((itemId && li.itemId && itemId.toString() === li.itemId.toString()) ||
           (resolvedItemName === li.itemName && resolvedLoaSerialNo === li.loaSerialNo)) &&
          (itemCircle === li.circle) &&
          (itemPackage === li.package)
        );

        if (existingLineIndex > -1) {
          disMap[diNumber].lineItems[existingLineIndex].quantity += quantity;
        } else {
          disMap[diNumber].lineItems.push({
            itemId,
            itemName: resolvedItemName,
            tempCode: resolvedTempCode,
            loaSerialNo: resolvedLoaSerialNo,
            package: itemPackage,
            circle: itemCircle,
            unit: finalUnit,
            quantity
          });
        }
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
    const globalAffectedItemIds = new Set<string>();
    
    const docsToInsert: any[] = [];
    const bulkUpdateOps: any[] = [];

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

          bulkUpdateOps.push({
            updateOne: {
              filter: { _id: existing._id },
              update: {
                $set: {
                  date: diData.date,
                  ...(diData.circle && { circle: diData.circle }),
                  ...(diData.package && { package: diData.package }),
                  ...(diData.status && { status: diData.status }),
                  ...(diData.notes !== undefined && { notes: diData.notes }),
                  ...(diData.vendorName && { vendorName: diData.vendorName }),
                  ...(diData.purchaseOrderId && { purchaseOrderId: diData.purchaseOrderId }),
                  lineItems: diData.lineItems
                }
              }
            }
          });
          successCount++;

          const allAffectedItemIds = Array.from(new Set([
            ...oldItemIds,
            ...diData.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean)
          ]));
          allAffectedItemIds.forEach(id => globalAffectedItemIds.add(id));

        } else {
          docsToInsert.push(diData);
          successCount++;
          
          for (const line of diData.lineItems) {
            if (line.itemId) globalAffectedItemIds.add(line.itemId.toString());
          }
        }
      } catch (err: any) {
        errors.push(`Failed to import DI ${diData.diNumber}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Import failed due to row errors. No data was imported.',
        data: { errors },
        errors
      });
    }

    try {
      if (docsToInsert.length > 0) {
        await DI.insertMany(docsToInsert);
      }
      if (bulkUpdateOps.length > 0) {
        await DI.bulkWrite(bulkUpdateOps);
      }
    } catch (error) {
      throw error;
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
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to import DI Registrations',
      data: { errors: [error.message] },
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

  const lifecycle = await getDiLifecycleState(di);
  if (lifecycle.state !== 'DRAFT') {
    throw new ApiError(400, `Cannot delete DI ${di.diNumber}. Linked to Purchase Invoice or Store Inward Entry.`);
  }

  // Soft delete instead of hard delete
  di.status = 'Cancelled';
  await di.save();

  const itemIds = di.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);

  for (const itemId of itemIds) {
    if (itemId) SummaryService.rebuildForItem(itemId).catch(console.error);
  }

  res.status(200).json(
    new ApiResponse(200, null, 'DI deleted successfully')
  );
});
