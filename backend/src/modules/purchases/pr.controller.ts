import { Request, Response } from 'express';
import { Pr } from './pr.schema';
import { PurchaseOrder } from './purchaseOrder.schema';
import { stringify } from 'csv-stringify/sync';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse/sync';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import mongoose from 'mongoose';
import { SummaryService } from '../reports/summary/summary.service';
import Item from '../items/item.model';

export const createPurchaseReceive = async (req: Request, res: Response): Promise<void> => {
  try {
    const prData = req.body;
    
    // Auto-generate PR number if not provided
    if (!prData.purchaseReceiveNumber) {
      const count = await Pr.countDocuments();
      prData.purchaseReceiveNumber = `PR-${String(count + 1).padStart(5, '0')}`;
    }

    const newPr = new Pr(prData);
    await newPr.save();

    if (newPr.lineItems && newPr.lineItems.length > 0) {
      const inwardEntries = newPr.lineItems.map((item: any) => ({
        purchaseInvoiceId: newPr._id,
        purchaseOrderId: newPr.purchaseOrderId,
        poNumber: newPr.purchaseOrderNumber,
        poDate: item.poDate,
        billingFrom: newPr.billingFrom,
        vendorName: newPr.vendorName,
        invoiceNumber: newPr.purchaseReceiveNumber,
        invoiceDate: newPr.receiveDate,
        diRefNo: newPr.diNo,
        circle: item.circle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.invoiceQuantity,
        totalQty: item.totalInvoiceQuantity,
        rate: item.rate,
        amount: item.totalAmount || item.amount,
        tempCode: item.tempCode,
        itemId: item.itemId,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        hsnCode: item.hsnCode,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        taxableAmount: item.amount,
        serialNumber: item.loaSerialNo,
        status: 'PENDING_RECEIPT',
        packingList: [{ packType: 'BOX', quantity: item.invoiceQuantity || 0 }] // default packing
      }));
      await StoreInwardEntry.insertMany(inwardEntries);

      // Rebuild summary for all items
      for (const item of newPr.lineItems) {
        if (item.itemId) SummaryService.rebuildForItem(item.itemId.toString()).catch(console.error);
      }
    }

    res.status(201).json({
      success: true,
      data: newPr
    });
  } catch (error: any) {
    console.error('Error creating Purchase Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Purchase Invoice',
      error: error.message
    });
  }
};

export const getPurchaseReceives = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.vendorName) {
      filter.vendorName = req.query.vendorName;
    }

    const [prs, total] = await Promise.all([
      Pr.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Pr.countDocuments(filter)
    ]);

    const prsWithQuantity = await Promise.all(prs.map(async (pr: any) => {
      const quantity = pr.lineItems?.reduce((acc: number, item: any) => acc + (Number(item.totalInvoiceQuantity) || 0), 0) || 0;
      
      let storeStatus = 'Pending';
      const totalEntries = await StoreInwardEntry.countDocuments({ purchaseInvoiceId: pr._id });
      if (totalEntries > 0) {
        const pendingEntries = await StoreInwardEntry.countDocuments({
          purchaseInvoiceId: pr._id,
          status: { $in: ['PENDING_RECEIPT', 'DRAFT'] }
        });
        storeStatus = pendingEntries > 0 ? 'Pending' : 'Accepted';
      } else {
        // If there are no entries but status is Draft, then it hasn't reached the store yet
        storeStatus = pr.status === 'Draft' ? 'Draft' : 'Pending';
      }

      return {
        ...pr,
        quantity,
        storeStatus
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        prs: prsWithQuantity,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching Purchase Invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Invoices',
      error: error.message
    });
  }
};

export const getPurchaseReceiveById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pr = await Pr.findById(id).lean();

    if (!pr) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
    }

    // Check if any StoreInwardEntry is beyond PENDING_RECEIPT or DRAFT
    const lockedEntries = await StoreInwardEntry.countDocuments({
      purchaseInvoiceId: pr._id,
      status: { $nin: ['PENDING_RECEIPT', 'DRAFT'] }
    });

    res.status(200).json({
      success: true,
      data: {
        ...pr,
        isLocked: lockedEntries > 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching Purchase Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Invoice',
      error: error.message
    });
  }
};

export const getNextPurchaseReceiveNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const lastPr = await Pr.findOne({ purchaseReceiveNumber: { $regex: /^PR-/i } })
      .sort({ createdAt: -1 })
      .lean();
      
    let nextNumber = 1;
    if (lastPr && lastPr.purchaseReceiveNumber) {
      const match = lastPr.purchaseReceiveNumber.match(/^PR-(\d+)$/i);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        prefix: 'PR-',
        nextNumber: nextNumber.toString().padStart(5, '0'),
        fullNumber: `PR-${nextNumber.toString().padStart(5, '0')}`
      }
    });
  } catch (error: any) {
    console.error('Error fetching next PR number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch next PR number',
      error: error.message
    });
  }
};

export const updatePurchaseReceive = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 1. Check if it is locked
    const lockedEntries = await StoreInwardEntry.countDocuments({
      purchaseInvoiceId: id,
      status: { $nin: ['PENDING_RECEIPT', 'DRAFT'] }
    });

    if (lockedEntries > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot edit this Purchase Invoice because the Store Manager has already begun processing it.'
      });
      return;
    }

    const updatedPr = await Pr.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedPr) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
    }

    // 2. Synchronize StoreInwardEntry records
    if (updatedPr.lineItems && updatedPr.lineItems.length > 0) {
      // Delete existing pending entries
      await StoreInwardEntry.deleteMany({
        purchaseInvoiceId: updatedPr._id,
        status: { $in: ['PENDING_RECEIPT', 'DRAFT'] }
      });

      // Recreate them with updated items
      const inwardEntries = updatedPr.lineItems.map((item: any) => ({
        purchaseInvoiceId: updatedPr._id,
        purchaseOrderId: updatedPr.purchaseOrderId,
        poNumber: updatedPr.purchaseOrderNumber,
        poDate: item.poDate,
        billingFrom: updatedPr.billingFrom,
        vendorName: updatedPr.vendorName,
        invoiceNumber: updatedPr.purchaseReceiveNumber,
        invoiceDate: updatedPr.receiveDate,
        diRefNo: updatedPr.diNo,
        circle: item.circle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.invoiceQuantity,
        totalQty: item.totalInvoiceQuantity,
        rate: item.rate,
        amount: item.amount,
        tempCode: item.tempCode,
        itemId: item.itemId,
        itemName: item.itemName,
        hsnCode: item.hsnCode,
        cgst: item.cgst,
        sgst: item.sgst,
        igst: item.igst,
        taxableAmount: item.amount,
        serialNumber: item.loaSerialNo,
        status: 'PENDING_RECEIPT',
        packingList: [{ packType: 'BOX', quantity: item.invoiceQuantity || 0 }]
      }));
      await StoreInwardEntry.insertMany(inwardEntries);
    }

    // Rebuild summary for old and new items
    const oldItemIds = updatedPr?.lineItems?.map((li: any) => li.itemId?.toString()).filter(Boolean) || [];
    const newItemIds = updateData.lineItems?.map((li: any) => li.itemId?.toString()).filter(Boolean) || [];
    const allAffectedItemIds = Array.from(new Set([...oldItemIds, ...newItemIds]));
    
    for (const itemId of allAffectedItemIds) {
      if (itemId) SummaryService.rebuildForItem(itemId).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: 'Purchase Invoice updated successfully',
      data: updatedPr
    });
  } catch (error: any) {
    console.error('Error updating Purchase Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Purchase Invoice',
      error: error.message
    });
  }
};

export const deletePurchaseReceive = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 1. Check if it is locked
    const lockedEntries = await StoreInwardEntry.countDocuments({
      purchaseInvoiceId: id,
      status: { $nin: ['PENDING_RECEIPT', 'DRAFT'] }
    });

    if (lockedEntries > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete this Purchase Invoice because the Store Manager has already begun processing it.'
      });
      return;
    }

    const deletedPr = await Pr.findByIdAndDelete(id);
    
    if (!deletedPr) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
    }

    // 2. Cascade delete orphaned inward entries
    await StoreInwardEntry.deleteMany({
      purchaseInvoiceId: id,
      status: { $in: ['PENDING_RECEIPT', 'DRAFT'] }
    });

    // Rebuild summary for deleted items
    if (deletedPr.lineItems && deletedPr.lineItems.length > 0) {
      for (const item of deletedPr.lineItems) {
        if (item.itemId) SummaryService.rebuildForItem(item.itemId.toString()).catch(console.error);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Purchase Invoice and pending inward entries deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting Purchase Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Purchase Invoice',
      error: error.message
    });
  }
};

export const exportPurchaseReceives = async (req: Request, res: Response): Promise<void> => {
  try {
    const receives = await Pr.find().sort({ createdAt: -1 }).lean();

    const csvData = receives.flatMap(r => 
      r.lineItems && r.lineItems.length > 0 ? r.lineItems.map((item: any) => ({
        PurchaseInvoiceNumber: r.purchaseReceiveNumber,
        PurchaseOrderNumber: r.purchaseOrderNumber || '',
        Date: r.receiveDate ? new Date(r.receiveDate).toISOString().split('T')[0] : '',
        VendorName: r.vendorName,
        Status: r.status,
        DINo: r.diNo || '',
        Billed: r.billed ? 'Yes' : 'No',
        ItemName: item.itemName,
        TempCode: item.tempCode || '',
        POQuantity: item.poQuantity,
        InvoiceQuantity: item.invoiceQuantity,
        Rate: item.rate || 0,
        Amount: item.amount || 0,
        CGST: item.cgst || 0,
        SGST: item.sgst || 0,
        IGST: item.igst || 0,
        TotalAmount: item.totalAmount || 0,
        BillingFrom: r.billingFrom || ''
      })) : [{
        PurchaseInvoiceNumber: r.purchaseReceiveNumber,
        PurchaseOrderNumber: r.purchaseOrderNumber || '',
        Date: r.receiveDate ? new Date(r.receiveDate).toISOString().split('T')[0] : '',
        VendorName: r.vendorName,
        Status: r.status,
        DINo: r.diNo || '',
        Billed: r.billed ? 'Yes' : 'No',
        ItemName: '', TempCode: '', POQuantity: '', InvoiceQuantity: '', Rate: '', Amount: '', CGST: '', SGST: '', IGST: '', TotalAmount: '',
        BillingFrom: r.billingFrom || ''
      }]
    );

    const csvString = stringify(csvData, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_invoices_export.csv');
    res.status(200).send(csvString);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to export Purchase Invoices',
      error: error.message,
    });
  }
};

export const importPurchaseReceives = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No CSV file uploaded' });
      return;
    }

    const parser = parseAndSanitizeCsv(req.file.buffer);

    const rows: any[] = [];
    const tempCodes = new Set<string>();
    const loaSerialNos = new Set<string>();
    const itemNames = new Set<string>();

    for await (const r of parser) {
      const row = r as any;
      rows.push(row);
      
      const tempCode = row['Temp Code'] || row['TempCode'] || row['tempCode'];
      const loaSerialNo = row['LOA Serial No'] || row['LOASerialNo'] || row['loaSerialNo'];
      const itemName = row['Item Name'] || row['ItemName'] || row['itemName'];
      
      if (tempCode) tempCodes.add(tempCode);
      if (loaSerialNo) loaSerialNos.add(loaSerialNo);
      if (itemName) itemNames.add(itemName);
    }

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
        const found = existingItems.find((i: any) => i.dynamicData?.tempCode === tCode);
        if (found) return found;
      }
      if (lSerial) {
        const found = existingItems.find((i: any) => 
          i.dynamicData?.loaSerialNo === lSerial || 
          i.dynamicData?.loaSerialNumber === lSerial || 
          i.dynamicData?.sku === lSerial
        );
        if (found) return found;
      }
      if (name) {
        const found = existingItems.find((i: any) => i.dynamicData?.name === name);
        if (found) return found;
      }
      return null;
    };

    const prMap: Record<string, any> = {};

    for (const row of rows) {
      const prNumber = row['PurchaseReceiveNumber'] || row['purchaseReceiveNumber'] || row['StoreInwardNumber'] || row['storeInwardNumber'] || row['PrNumber'] || row['prNumber'];
      if (!prNumber) continue;

      if (!prMap[prNumber]) {
        prMap[prNumber] = {
          purchaseReceiveNumber: prNumber,
          purchaseOrderNumber: row['PurchaseOrderNumber'] || row['purchaseOrderNumber'] || '',
          receiveDate: row['Date'] || row['receiveDate'] || new Date().toISOString().split('T')[0],
          vendorName: row['VendorName'] || row['vendorName'],
          status: row['Status'] || row['status'] || 'Draft',
          diNo: row['DINo'] || row['diNo'] || '',
          billed: (row['Billed'] || row['billed'] || '').toLowerCase() === 'yes',
          lineItems: [],
        };
      }

      const itemName = row['Item Name'] || row['ItemName'] || row['itemName'];
      const tempCode = row['Temp Code'] || row['TempCode'] || row['tempCode'] || '';
      const loaSerialNo = row['LOA Serial No'] || row['LOASerialNo'] || row['loaSerialNo'] || '';

      if (itemName) {
        const item = findItemInMemory(tempCode, loaSerialNo, itemName);
        const itemId = item ? item._id : null;

        prMap[prNumber].lineItems.push({
          itemId,
          itemName,
          itemDescription: row['Description'] || row['description'] || '',
          loaSerialNo,
          tempCode,
          package: row['Package'] || row['package'] || '',
          circle: row['Circle'] || row['circle'] || '',
          hsnCode: row['HSN Code'] || row['HSNCode'] || row['hsnCode'] || '',
          unit: row['Unit'] || row['unit'] || '',
          poDate: row['PO Date'] || row['PODate'] || row['poDate'] || undefined,
          poQuantity: Number(row['PO Qty'] || row['POQuantity'] || row['poQuantity'] || 0),
          invoiceQuantity: Number(row['Inv Qty'] || row['InvoiceQuantity'] || row['invoiceQuantity'] || 0),
          srt: Number(row['SRT'] || row['srt'] || 0),
          act: Number(row['ACT'] || row['act'] || 0),
          totalInvoiceQuantity: Number(row['Tot Inv Qty'] || row['TotInvQty'] || row['totalInvoiceQuantity'] || 0),
          rate: Number(row['Rate'] || row['rate'] || 0),
          amount: Number(row['Amount'] || row['amount'] || 0),
          gstType: row['GST Type'] || row['GSTType'] || row['gstType'] || 'Intra State',
          cgst: Number(row['CGST %'] || row['CGST'] || row['cgst'] || 0),
          sgst: Number(row['SGST %'] || row['SGST'] || row['sgst'] || 0),
          igst: Number(row['IGST %'] || row['IGST'] || row['igst'] || 0),
          totalAmount: Number(row['Total Amount'] || row['TotalAmount'] || row['totalAmount'] || 0)
        });
      }
    }

    const prNumbers = Object.keys(prMap);
    const poNumbers = Array.from(new Set(prNumbers.map(n => prMap[n].purchaseOrderNumber).filter(Boolean)));

    const [existingPRs, existingPOs] = await Promise.all([
      Pr.find({ purchaseReceiveNumber: { $in: prNumbers } }),
      poNumbers.length > 0 ? PurchaseOrder.find({ purchaseOrderNumber: { $in: poNumbers } }) : []
    ]);

    let successCount = 0;
    const errors: any[] = [];
    const globalAffectedItemIds = new Set<string>();
    
    for (const prNumber of prNumbers) {
      const prData = prMap[prNumber];
      try {
        const existing = existingPRs.find(p => p.purchaseReceiveNumber === prData.purchaseReceiveNumber);
        if (existing) {
          errors.push(`Purchase Invoice ${prData.purchaseReceiveNumber} already exists.`);
          continue;
        }

        if (prData.purchaseOrderNumber) {
          const po = existingPOs.find(p => p.purchaseOrderNumber === prData.purchaseOrderNumber);
          if (po) {
            prData.purchaseOrderId = po._id;
          }
        }

        const createdPr = await Pr.create(prData);
        successCount++;

        // Queue rebuild summary for imported items
        if (createdPr.lineItems && createdPr.lineItems.length > 0) {
          for (const item of createdPr.lineItems) {
            if (item.itemId) globalAffectedItemIds.add(item.itemId.toString());
          }
        }
      } catch (err: any) {
        errors.push(`Failed to import Invoice ${prData.purchaseReceiveNumber}: ${err.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Import processed',
      data: {
        successCount,
        errors
      }
    });

    const uniqueItemIds = Array.from(globalAffectedItemIds);
    setTimeout(() => {
      (async () => {
        for (let i = 0; i < uniqueItemIds.length; i += 10) {
          const chunk = uniqueItemIds.slice(i, i + 10);
          await Promise.all(chunk.map(id => SummaryService.rebuildForItem(id).catch(console.error)));
        }
      })();
    }, 500);

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to import Purchase Invoices',
      error: error.message,
    });
  }
};
