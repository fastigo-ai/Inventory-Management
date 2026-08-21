import { Request, Response } from 'express';
import { PurchaseInvoice } from './purchaseInvoice.schema';
import { PurchaseOrder } from './purchaseOrder.schema';
import { stringify } from 'csv-stringify/sync';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse/sync';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import mongoose from 'mongoose';
import { SummaryService } from '../reports/summary/summary.service';
import Item from '../items/item.model';
import { ValidationService } from '../../core/document-engine/validation/validation.service';
import { RelationsService } from '../../core/document-engine/relations/relations.service';
import { DI } from '../di/di.schema';
import { reverseInwardStockUpdate } from '../store/store.controller';

export const createPurchaseInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const prData = req.body;
    // Map PR fields to PI fields
    if (!prData.invoiceNumber && !prData.purchaseReceiveNumber) {
      const count = await PurchaseInvoice.countDocuments();
      prData.invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;
    } else {
      prData.invoiceNumber = prData.invoiceNumber || prData.purchaseReceiveNumber;
    }
    prData.date = prData.date || prData.receiveDate || new Date();
    
    // Always set invoice status to Paid
    prData.status = 'Paid';
    
    if (prData.billingFrom) {
      prData.billingCompany = { name: prData.billingFrom };
    } else if (prData.purchaseOrderId) {
      const PurchaseOrder = mongoose.model('PurchaseOrder');
      const po: any = await PurchaseOrder.findById(prData.purchaseOrderId).lean();
      if (po && po.billingCompany && po.billingCompany.name) {
        prData.billingCompany = { name: po.billingCompany.name };
      } else if (po && po.billingFrom) {
        prData.billingCompany = { name: po.billingFrom };
      }
    }
    
    if (!prData.diNumber && !prData.diNo && prData.lineItems && prData.lineItems.length > 0) {
      const firstDiId = prData.lineItems.find((i: any) => i.diId)?.diId;
      if (firstDiId) {
        const DIModel = mongoose.model('DI');
        const di: any = await DIModel.findById(firstDiId).lean();
        if (di && di.diNumber) {
          prData.diNumber = di.diNumber;
          prData.diNo = di.diNumber;
        }
      }
    }
    
    if (prData.lineItems) {
      prData.lineItems = prData.lineItems.map((item: any) => {
        const qty = Number(item.quantity || item.invoiceQuantity || item.act || 0);
        const rate = Number(item.rate || 0);
        const amount = qty * rate;

        let cgst = Number(item.cgst) || 0;
        let sgst = Number(item.sgst) || 0;
        let igst = Number(item.igst) || 0;

        const gstType = (item.gstType || '').toUpperCase().replace(/\s/g, '');
        if (gstType === 'INTERSTATE') {
          cgst = 0;
          sgst = 0;
          igst = igst > 0 ? igst : 18;
        } else {
          igst = 0; // Default INTRASTATE
          cgst = cgst > 0 ? cgst : 9;
          sgst = sgst > 0 ? sgst : 9;
        }

        const taxAmount = amount * ((cgst + sgst + igst) / 100);
        const totalAmount = amount + taxAmount;

        return {
          ...item,
          quantity: qty,
          totalInventory: item.totalInventory || item.totalInvoiceQuantity || 0,
          rate,
          amount,
          cgst,
          sgst,
          igst,
          totalAmount,
          description: item.description || item.itemDescription
        };
      });
      
      const diLinesToConsume = prData.lineItems
        .filter((i: any) => i.diId && i.diLineId)
        .map((i: any) => ({
          lineId: i.diLineId.toString(),
          quantity: Number(i.quantity) || 0,
          itemName: `${i.itemName} (DI: ${prData.diNumber || prData.diNo || 'N/A'}, Temp Code: ${i.tempCode || 'N/A'}, Circle: ${i.circle || 'N/A'}, Package: ${i.package || 'N/A'})`
        }));
      
      if (diLinesToConsume.length > 0) {
        const diId = prData.lineItems.find((i: any) => i.diId).diId.toString();
        await ValidationService.validateConsumption(diId, diLinesToConsume);
      }
    }

    const newPr = new PurchaseInvoice(prData);
    await newPr.save();

    // Automatically link to DI and PO
    const diId = prData.lineItems?.find((i: any) => i.diId)?.diId;
    if (diId) {
      await RelationsService.linkDocuments(diId.toString(), 'DispatchInstruction', newPr._id.toString(), 'PurchaseInvoice');
      
      // Update DI invoiced quantities
      const di = await DI.findById(diId);
      if (di && newPr.lineItems) {
        let diUpdated = false;
        newPr.lineItems.forEach((invItem: any) => {
          if (invItem.diLineId) {
            const diItem = di.lineItems.find((dItem: any) => dItem._id.toString() === invItem.diLineId.toString());
            if (diItem) {
              diItem.invoicedQuantity = (diItem.invoicedQuantity || 0) + (Number(invItem.quantity) || 0);
              diUpdated = true;
            }
          }
        });
        if (diUpdated) {
          await di.save();
        }
      }
    }
    if (newPr.purchaseOrderId) {
      await RelationsService.linkDocuments(newPr.purchaseOrderId.toString(), 'PurchaseOrder', newPr._id.toString(), 'PurchaseInvoice');
      
      // Update PO invoiced quantities
      const po = await PurchaseOrder.findById(newPr.purchaseOrderId);
      if (po && newPr.lineItems) {
        let poUpdated = false;
        newPr.lineItems.forEach((invItem: any) => {
          const poItem = po.lineItems.find((pItem: any) => 
            (pItem.itemId && invItem.itemId && pItem.itemId.toString() === invItem.itemId.toString()) || 
            (pItem.tempCode && invItem.tempCode && pItem.tempCode === invItem.tempCode) ||
            pItem.itemName === invItem.itemName
          );
          if (poItem) {
            poItem.invoicedQuantity = (poItem.invoicedQuantity || 0) + (Number(invItem.quantity) || 0);
            poUpdated = true;
          }
        });
        if (poUpdated) {
          await po.save();
        }
      }
    }

    if (newPr.lineItems && newPr.lineItems.length > 0) {
      const inwardEntries = newPr.lineItems.map((item: any) => ({
        purchaseInvoiceId: newPr._id,
        purchaseOrderId: newPr.purchaseOrderId,
        poNumber: newPr.purchaseOrderNumber,
        poDate: item.poDate,
        billingFrom: newPr.billingCompany?.name || (newPr as any).billingFrom,
        vendorName: newPr.vendorName,
        invoiceNumber: newPr.invoiceNumber,
        invoiceDate: newPr.date,
        diRefNo: newPr.diNumber || (newPr as any).diNo,
        circle: item.circle,
        subcircle: item.subcircle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.totalInventory !== undefined ? item.totalInventory : item.quantity,
        totalQty: item.totalInventory !== undefined ? item.totalInventory : item.quantity,
        srt: item.srt,
        act: item.act,
        rate: item.rate,
        amount: item.totalAmount,
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

export const getPurchaseInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};
    
    if (req.query.vendorName) {
      filter.vendorName = req.query.vendorName;
    }
    
    if (req.query.invoiceNumber) {
      filter.invoiceNumber = { $regex: req.query.invoiceNumber as string, $options: 'i' };
    }

    if (req.query.status) {
      const statuses = Array.isArray(req.query.status) ? req.query.status : [req.query.status];
      filter.status = { $in: statuses };
    }

    if (req.query.receiptStatus) {
      const rStatuses = Array.isArray(req.query.receiptStatus) ? req.query.receiptStatus : [req.query.receiptStatus];
      filter.receiptStatus = { $in: rStatuses };
    }

    if (req.query.billedStatus) {
      const bStatuses = Array.isArray(req.query.billedStatus) ? req.query.billedStatus : [req.query.billedStatus];
      filter.billedStatus = { $in: bStatuses };
    }

    if (req.query.fromDate || req.query.toDate) {
      filter.date = {};
      if (req.query.fromDate) filter.date.$gte = new Date(req.query.fromDate as string);
      if (req.query.toDate) {
        const toDate = new Date(req.query.toDate as string);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    if (req.query.minAmount || req.query.maxAmount) {
      filter.total = {};
      if (req.query.minAmount) filter.total.$gte = Number(req.query.minAmount);
      if (req.query.maxAmount) filter.total.$lte = Number(req.query.maxAmount);
    }

    if (req.query.hasPO === 'true') {
      filter.purchaseOrderId = { $exists: true, $ne: null };
    } else if (req.query.hasPO === 'false') {
      filter.purchaseOrderId = { $eq: null };
    }

    if (req.query.hasDI === 'true') {
      filter.$or = [
        { diNumber: { $exists: true, $ne: '' } },
        { 'lineItems.diId': { $exists: true, $ne: null } }
      ];
    } else if (req.query.hasDI === 'false') {
      filter.$and = [
        { $or: [{ diNumber: { $exists: false } }, { diNumber: '' }] },
        { 'lineItems.diId': { $eq: null } }
      ];
    }

    const [prs, total] = await Promise.all([
      PurchaseInvoice.find(filter).sort({ date: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
      PurchaseInvoice.countDocuments(filter)
    ]);

    const prsWithQuantity = await Promise.all(prs.map(async (pr: any) => {
      // Map it back for the frontend which expects PR fields
      pr.purchaseReceiveNumber = pr.invoiceNumber;
      pr.PurchaseInvoiceNumber = pr.invoiceNumber;
      pr.receiveDate = pr.date;
      
      const quantity = pr.lineItems?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || Number(item.totalInvoiceQuantity) || 0), 0) || 0;
      
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

export const getUniqueVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendors = await PurchaseInvoice.distinct('vendorName');
    res.status(200).json({
      success: true,
      data: vendors.filter(v => v) // filter out null/undefined
    });
  } catch (error: any) {
    console.error('Error fetching unique vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unique vendors',
      error: error.message
    });
  }
};

export const getPurchaseInvoiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pr: any = await PurchaseInvoice.findById(id)
      .populate('lineItems.itemId', 'dynamicData')
      .lean();

    if (!pr) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
    }

    // Hydrate missing descriptions and units from the populated itemId, then revert itemId to string
    if (pr.lineItems && pr.lineItems.length > 0) {
      pr.lineItems = pr.lineItems.map((item: any) => {
        if (!item.description && item.itemId && item.itemId.dynamicData) {
          item.description = item.itemId.dynamicData.description || item.itemId.dynamicData.itemDescription || '';
        }
        if (!item.unit && item.itemId && item.itemId.dynamicData) {
          item.unit = item.itemId.dynamicData.unit || item.itemId.dynamicData.uom || '';
        }
        
        // Ensure itemId is a string ID for the frontend forms
        if (item.itemId && item.itemId._id) {
          item.itemId = item.itemId._id.toString();
        }
        
        // Map quantity and inventory fields for frontend components expecting these keys
        item.invoiceQuantity = item.quantity || 0;
        item.totalInvoiceQuantity = item.totalInventory || 0;
        
        return item;
      });
    }

    // Check if any StoreInwardEntry is beyond PENDING_RECEIPT or DRAFT
    const lockedEntries = await StoreInwardEntry.countDocuments({
      purchaseInvoiceId: pr._id,
      status: { $nin: ['PENDING_RECEIPT', 'DRAFT'] }
    });

    // Map fields for frontend
    pr.purchaseReceiveNumber = pr.invoiceNumber;
    pr.PurchaseInvoiceNumber = pr.invoiceNumber;
    pr.receiveDate = pr.date;
    pr.billingFrom = pr.billingCompany?.name || pr.billingFrom || '';

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

export const getNextPurchaseInvoiceNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const lastPr = await PurchaseInvoice.findOne({ invoiceNumber: { $regex: /^INV-/i } })
      .sort({ createdAt: 1 })
      .lean();
      
    let nextNumber = 1;
    if (lastPr && lastPr.invoiceNumber) {
      const match = lastPr.invoiceNumber.match(/^INV-(\d+)$/i);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        prefix: 'INV-',
        nextNumber: String(nextNumber).padStart(5, '0'),
        fullNumber: `INV-${String(nextNumber).padStart(5, '0')}`
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

export const updatePurchaseInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const lockedEntries = await StoreInwardEntry.countDocuments({
      purchaseInvoiceId: id,
      status: { $nin: ['PENDING_RECEIPT', 'DRAFT'] }
    });

    // If they are trying to modify line items or core details on a locked invoice, block it.
    // If they are just updating the status (e.g., to 'Received'), allow it.
    const isStatusOnlyUpdate = Object.keys(updateData).length === 1 && updateData.status;
    const isNotesUpdate = Object.keys(updateData).every(k => ['status', 'notes', 'remarks'].includes(k));
    
    if (lockedEntries > 0 && !isStatusOnlyUpdate && !isNotesUpdate) {
      res.status(400).json({
        success: false,
        message: 'Cannot edit this Purchase Invoice because the Store Manager has already begun processing it.'
      });
      return;
    }

    if (updateData.purchaseReceiveNumber) updateData.invoiceNumber = updateData.purchaseReceiveNumber;
    if (updateData.receiveDate) updateData.date = updateData.receiveDate;
    
    if (updateData.billingFrom) {
      updateData.billingCompany = { name: updateData.billingFrom };
    }
    
    // Always set status to Paid as requested
    updateData.status = 'Paid';

    if (updateData.lineItems) {
      updateData.lineItems = updateData.lineItems.map((item: any) => {
        const qty = Number(item.quantity || item.invoiceQuantity || item.act || 0);
        const rate = Number(item.rate || 0);
        const amount = qty * rate;

        let cgst = Number(item.cgst) || 0;
        let sgst = Number(item.sgst) || 0;
        let igst = Number(item.igst) || 0;

        const gstType = (item.gstType || '').toUpperCase().replace(/\s/g, '');
        if (gstType === 'INTERSTATE') {
          cgst = 0;
          sgst = 0;
          igst = igst > 0 ? igst : 18;
        } else {
          igst = 0; // Default INTRASTATE
          cgst = cgst > 0 ? cgst : 9;
          sgst = sgst > 0 ? sgst : 9;
        }

        const taxAmount = amount * ((cgst + sgst + igst) / 100);
        const totalAmount = amount + taxAmount;

        return {
          ...item,
          quantity: qty,
          totalInventory: item.totalInventory || item.totalInvoiceQuantity || 0,
          rate,
          amount,
          cgst,
          sgst,
          igst,
          totalAmount,
          description: item.description || item.itemDescription
        };
      });
      
      const diLinesToConsume = updateData.lineItems
        .filter((i: any) => i.diId && i.diLineId)
        .map((i: any) => ({
          lineId: i.diLineId.toString(),
          quantity: Number(i.quantity) || 0,
          itemName: `${i.itemName} (DI: ${updateData.diNumber || updateData.diNo || 'N/A'}, Temp Code: ${i.tempCode || 'N/A'}, Circle: ${i.circle || 'N/A'}, Package: ${i.package || 'N/A'})`
        }));
      
      if (diLinesToConsume.length > 0) {
        const diId = updateData.lineItems.find((i: any) => i.diId).diId.toString();
        await ValidationService.validateConsumption(diId, diLinesToConsume, typeof id === 'string' ? id : String(id));
      }
    }

    const updatedPr: any = await PurchaseInvoice.findByIdAndUpdate(id, updateData, { new: true }).lean();
    
    if (!updatedPr) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
    }

    // Automatically link to DI and PO
    const diId = updateData.lineItems?.find((i: any) => i.diId)?.diId;
    if (diId) {
      await RelationsService.linkDocuments(diId.toString(), 'DispatchInstruction', updatedPr._id.toString(), 'PurchaseInvoice');
    }
    if (updatedPr.purchaseOrderId) {
      await RelationsService.linkDocuments(updatedPr.purchaseOrderId.toString(), 'PurchaseOrder', updatedPr._id.toString(), 'PurchaseInvoice');
    }

    // 2. Synchronize StoreInwardEntry records ONLY if lineItems were modified
    if (updateData.lineItems && updatedPr.lineItems && updatedPr.lineItems.length > 0) {
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
        billingFrom: updatedPr.billingCompany?.name || updatedPr.billingFrom,
        vendorName: updatedPr.vendorName,
        invoiceNumber: updatedPr.invoiceNumber,
        invoiceDate: updatedPr.date,
        diRefNo: updatedPr.diNumber || updatedPr.diNo,
        circle: item.circle,
        subcircle: item.subcircle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.totalInventory !== undefined ? item.totalInventory : item.quantity,
        totalQty: item.totalInventory !== undefined ? item.totalInventory : item.quantity,
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

export const deletePurchaseInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // 1. Fetch all StoreInwardEntry records linked to this invoice
    const inwardEntries = await StoreInwardEntry.find({ purchaseInvoiceId: id });
    
    // 2. Rollback inventory for any processed inward entries
    for (const entry of inwardEntries) {
      if (entry.status === 'VERIFIED' || entry.status === 'SUBMITTED') {
        await reverseInwardStockUpdate(entry._id.toString());
      }
    }

    const pi = await PurchaseInvoice.findById(id);
    
    if (!pi) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
    }

    // 3. Delete all inward entries for this invoice
    await StoreInwardEntry.deleteMany({
      purchaseInvoiceId: id
    });
    
    // 4. Delete the Purchase Invoice itself
    await PurchaseInvoice.findByIdAndDelete(id);

    // Rebuild summary for deleted/cancelled items
    if (pi.lineItems && pi.lineItems.length > 0) {
      for (const item of pi.lineItems) {
        if (item.itemId) SummaryService.rebuildForItem(item.itemId.toString()).catch(console.error);
      }
    }

    res.status(200).json({
      success: true,
      message: pi.status === 'Draft' ? 'Purchase Invoice hard deleted successfully' : 'Purchase Invoice cancelled successfully'
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

export const exportPurchaseInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const receives = await PurchaseInvoice.find().sort({ createdAt: 1 }).lean();

    const csvData = receives.flatMap(r => 
      r.lineItems && r.lineItems.length > 0 ? r.lineItems.map((item: any) => ({
        "Vendor Name": r.vendorName || '',
        "Purchase Order#": r.purchaseOrderNumber || '',
        "Received Date": r.date ? new Date(r.date).toISOString().split('T')[0] : '',
        "Billing From": r.billingFrom || '',
        "Purchase Invoice#": r.invoiceNumber || '',
        "DI No": r.diNumber || (r as any).diNo || '',
        "DI Date": item.diDate ? new Date(item.diDate).toISOString().split('T')[0] : '',
        "PACKAGE": item.package || '',
        "CIRCLE": item.circle || '',
        "Subcircle": item.subcircle || '',
        "Temp Code": item.tempCode || '',
        "Item Name": item.itemName || '',
        "Description": item.description || '',
        "LOA Serial No": item.loaSerialNo || '',
        "HSN Code": item.hsnCode || '',
        "Inv Qty": item.quantity || item.invoiceQuantity || 0,
        "Unit": item.unit || '',
        "Rate": item.rate || 0,
        "GST Type": item.gstType || 'Intra State',
        "CGST %": item.cgst || 0,
        "SGST %": item.sgst || 0,
        "IGST %": item.igst || 0
      })) : [{
        "Vendor Name": r.vendorName || '',
        "Purchase Order#": r.purchaseOrderNumber || '',
        "Received Date": r.date ? new Date(r.date).toISOString().split('T')[0] : '',
        "Billing From": r.billingFrom || '',
        "Purchase Invoice#": r.invoiceNumber || '',
        "DI No": r.diNumber || (r as any).diNo || '',
        "DI Date": '',
        "PACKAGE": '',
        "CIRCLE": '',
        "Subcircle": '',
        "Temp Code": '',
        "Item Name": '',
        "Description": '',
        "LOA Serial No": '',
        "HSN Code": '',
        "Inv Qty": 0,
        "Unit": '',
        "Rate": 0,
        "GST Type": 'Intra State',
        "CGST %": 0,
        "SGST %": 0,
        "IGST %": 0
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

export const importPurchaseInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No CSV file uploaded' });
      return;
    }

    const parser = parseAndSanitizeCsv(req.file.buffer);

    const rows: any[] = [];
    const errors: string[] = [];
    const tempCodes = new Set<string>();
    const loaSerialNos = new Set<string>();
    const itemNames = new Set<string>();

    for await (const r of parser) {
      const row = r as any;
      const nRow: any = {};
      for (const key of Object.keys(row)) {
        nRow[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key];
      }
      rows.push(nRow);
      
      const tempCode = nRow['tempcode'];
      const loaSerialNo = nRow['loaserialno'] || nRow['serialno'] || nRow['sku'];
      const itemName = nRow['itemname'];
      
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

    // Safely parses a CSV numeric value, stripping commas and non-numeric chars
    const safeNum = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      const cleaned = String(val).replace(/,/g, '').trim();
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    };

    // Safely parses date strings like DD-MM-YYYY, DD/MM/YYYY, or ISO format
    const safeDate = (val: any): string => {
      if (!val) return new Date().toISOString().split('T')[0];
      const str = String(val).trim();
      // Match DD-MM-YYYY or DD/MM/YYYY
      const ddmmyyyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      if (ddmmyyyy) {
        const [, d, m, y] = ddmmyyyy;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // Match YYYY-MM-DD already fine
      const iso = str.match(/^\d{4}-\d{2}-\d{2}/);
      if (iso) return str.split('T')[0];
      // Fallback: try native Date parse
      const d = new Date(str);
      return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
    };

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const actualRowNumber = rowIndex + 2; // +1 for header, +1 for 0-index
      const prNumber = row['purchaseinvoicenumber'] || row['invoicenumber'] || row['purchaseinvoice'] || row['purchasereceivenumber'] || row['storeinwardnumber'] || row['prnumber'];
      if (!prNumber) continue;

      if (!prMap[prNumber]) {
        prMap[prNumber] = {
          invoiceNumber: prNumber,
          rowNumbers: [],
          purchaseOrderNumber: row['purchaseordernumber'] || row['purchaseorder'] || '',
          date: safeDate(row['date'] || row['receiveddate']),
          vendorName: row['vendorname'],
          status: row['status'] || 'Draft',
          diNumber: row['dino'] || row['dinumber'] || '',
          billed: (row['billed'] || '').toLowerCase() === 'yes',
          billingCompany: row['billingfrom'] ? { name: row['billingfrom'] } : undefined,
          billingFrom: row['billingfrom'] || '',
          lineItems: [],
        };
      }
      prMap[prNumber].rowNumbers.push(actualRowNumber);

      const itemName = row['itemname'];
      const tempCode = row['tempcode'] || '';
      const loaSerialNo = row['loaserialno'] || row['serialno'] || '';

      if (itemName) {
        const item = findItemInMemory(tempCode, loaSerialNo, itemName);
        if (!item) {
          errors.push(`Row ${actualRowNumber}: UNRESOLVED_ITEM - Could not find item matching Temp Code "${tempCode}", Serial "${loaSerialNo}", or Name "${itemName}"`);
          continue;
        }
        
        const itemId = item._id;
        const qty = safeNum(row['invqty'] || row['invoicequantity'] || row['quantity'] || row['act']);
        const rate = safeNum(row['rate']);
        const amount = qty * rate;

        const rawGstType = (row['gsttype'] || 'Intra State').toUpperCase().replace(/\s/g, '');
        let cgst = safeNum(row['cgst']);
        let sgst = safeNum(row['sgst']);
        let igst = safeNum(row['igst']);

        if (rawGstType === 'INTERSTATE') {
           if (cgst > 0 || sgst > 0) {
             errors.push(`Row ${actualRowNumber}: Tax Structure Mismatch - INTERSTATE cannot have CGST or SGST > 0 for item "${itemName}"`);
             continue;
           }
           igst = igst > 0 ? igst : 18;
           cgst = 0;
           sgst = 0;
        } else {
           if (igst > 0) {
             errors.push(`Row ${actualRowNumber}: Tax Structure Mismatch - INTRASTATE cannot have IGST > 0 for item "${itemName}"`);
             continue;
           }
           igst = 0;
           cgst = cgst > 0 ? cgst : 9;
           sgst = sgst > 0 ? sgst : 9;
        }

        const taxAmount = amount * ((cgst + sgst + igst) / 100);
        const totalAmount = amount + taxAmount;

        prMap[prNumber].lineItems.push({
          rowNumber: actualRowNumber,
          itemId,
          itemName,
          description: row['description'] || row['itemdescription'] || '',
          loaSerialNo,
          tempCode,
          package: row['package'] || '',
          circle: row['circle'] || '',
          subcircle: row['subcircle'] || '',
          hsnCode: row['hsncode'] || '',
          unit: row['unit'] || '',
          poDate: row['podate'] || undefined,
          poQuantity: safeNum(row['poqty'] || row['poquantity']),
          quantity: qty,
          srt: safeNum(row['srt']),
          act: safeNum(row['act']),
          totalInventory: safeNum(row['totinvqty'] || row['totalinvoicequantity']),
          rate,
          amount,
          gstType: row['gsttype'] || 'Intra State',
          cgst,
          sgst,
          igst,
          totalAmount
        });
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Import failed due to validation errors',
        data: { errors }
      });
      return;
    }

    const prNumbers = Object.keys(prMap);
    const poNumbers = Array.from(new Set(prNumbers.map(n => prMap[n].purchaseOrderNumber).filter(Boolean)));
    const diNumbers = Array.from(new Set(prNumbers.map(n => prMap[n].diNumber).filter(Boolean)));

    const [existingPRs, existingPOs, existingDIs] = await Promise.all([
      PurchaseInvoice.find({ invoiceNumber: { $in: prNumbers } }),
      poNumbers.length > 0 ? PurchaseOrder.find({ purchaseOrderNumber: { $in: poNumbers } }) : [],
      diNumbers.length > 0 ? DI.find({ diNumber: { $in: diNumbers } }) : []
    ]);

    for (const prNumber of prNumbers) {
      const prData = prMap[prNumber];
      if (prData.diNumber) {
        const di = existingDIs.find((d: any) => d.diNumber === prData.diNumber);
        if (di) {
          prData.lineItems.forEach((li: any) => {
            li.diId = di._id;
            const diLine = di.lineItems.find((dli: any) => {
              const itemMatch = (dli.itemId && li.itemId && dli.itemId.toString() === li.itemId.toString()) ||
                (dli.tempCode && li.tempCode && dli.tempCode === li.tempCode) ||
                dli.itemName === li.itemName;
              if (!itemMatch) return false;
              
              const circleMatch = (!dli.circle || !li.circle || dli.circle.trim().toLowerCase() === li.circle.trim().toLowerCase());
              const packageMatch = (!dli.package || !li.package || dli.package.trim().toLowerCase() === li.package.trim().toLowerCase());
              return circleMatch && packageMatch;
            });
            if (diLine) {
              li.diLineId = (diLine as any)._id;
            }
          });
        } else {
          errors.push(`Validation Error for Invoice# ${prData.invoiceNumber}: DI number "${prData.diNumber}" does not exist in the system.`);
        }
      }
    }

    let successCount = 0;
    const globalAffectedItemIds = new Set<string>();

    const chunkArray = <T>(array: T[], size: number): T[][] => {
      const chunked: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
      }
      return chunked;
    };

    // ── PASS 1: Validate DI allocations before writing ─────────────────────
    for (const prNumber of prNumbers) {
      const prData = prMap[prNumber];

      // Mark if existing (for upsert decision)
      const existing = existingPRs.find(p => p.invoiceNumber === prData.invoiceNumber);
      prData._existingId = existing ? existing._id : null;

      if (prData.purchaseOrderNumber) {
        const po = existingPOs.find(p => p.purchaseOrderNumber === prData.purchaseOrderNumber);
        if (po) {
          prData.purchaseOrderId = po._id;
          
          for (const li of prData.lineItems) {
            const poLine = po.lineItems.find((pl: any) => 
              (pl.itemId && li.itemId && pl.itemId.toString() === li.itemId.toString()) || 
              (pl.itemName === li.itemName)
            );
            
            if (poLine) {
              if (li.quantity > poLine.quantity) {
                errors.push(`Row ${li.rowNumber}: Inv Qty (${li.quantity}) cannot exceed remaining PO Qty (${poLine.quantity}) for item "${li.itemName}"`);
              }
            }
          }
        }
      }

      const diLinesToConsume = prData.lineItems
        .filter((i: any) => i.diId && i.diLineId)
        .map((i: any) => ({ 
          lineId: i.diLineId.toString(), 
          quantity: Number(i.quantity) || 0, 
          itemName: `${i.itemName} (DI: ${prData.diNumber || 'N/A'}, Temp Code: ${i.tempCode || 'N/A'}, Circle: ${i.circle || 'N/A'}, Package: ${i.package || 'N/A'})` 
        }));

      if (diLinesToConsume.length > 0) {
        const diIdForConsumption = prData.lineItems.find((i: any) => i.diId).diId.toString();
        // For existing PIs, exclude the PI itself from allocation check to allow re-import
        const excludeId = prData._existingId ? prData._existingId.toString() : undefined;
        try {
          await ValidationService.validateConsumption(diIdForConsumption, diLinesToConsume, excludeId);
          prData._diIdForConsumption = diIdForConsumption;
        } catch (err: any) {
          errors.push(`Validation Error for Invoice# ${prData.invoiceNumber}: ${err.message}`);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Import failed due to validation errors',
        data: { errors }
      });
      return;
    }

    // ── PASS 2: All validations passed — upsert everything ──────────────────
    const prChunks = chunkArray(prNumbers, 25);
    
    // Transactions disabled entirely to support Atlas M0/M2/M5 shared proxies
    const session = undefined;

    try {
    for (const chunk of prChunks) {
      await Promise.all(chunk.map(async (prNumber) => {
        const prData = prMap[prNumber];
        const diIdForConsumption = prData._diIdForConsumption || null;

        // Upsert: update existing or create new
        const { _existingId, _diIdForConsumption, rowNumbers, ...prPayload } = prData;
        const savedPr = await PurchaseInvoice.findOneAndUpdate(
          { invoiceNumber: prData.invoiceNumber },
          { $set: prPayload },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, session: session || undefined }
        );
        successCount++;

        // Link Relations
        if (diIdForConsumption) {
          await RelationsService.linkDocuments(diIdForConsumption, 'DispatchInstruction', savedPr._id.toString(), 'PurchaseInvoice', 'CONSUMES', session);
        }
        if (savedPr.purchaseOrderId) {
          await RelationsService.linkDocuments(savedPr.purchaseOrderId.toString(), 'PurchaseOrder', savedPr._id.toString(), 'PurchaseInvoice', 'CONSUMES', session);
        }

        // Recreate Store Receipts (delete old ones first on update)
        if (_existingId) {
          await StoreInwardEntry.deleteMany({ purchaseInvoiceId: savedPr._id }, { session: session || undefined });
        }
        if (savedPr.lineItems && savedPr.lineItems.length > 0) {
          const inwardEntries = savedPr.lineItems.map((item: any) => ({
            purchaseInvoiceId: savedPr._id,
            purchaseOrderId: savedPr.purchaseOrderId,
            poNumber: savedPr.purchaseOrderNumber,
            poDate: item.poDate,
            billingFrom: savedPr.billingCompany?.name || (savedPr as any).billingFrom,
            vendorName: savedPr.vendorName,
            invoiceNumber: savedPr.invoiceNumber,
            invoiceDate: savedPr.date,
            diRefNo: savedPr.diNumber || (savedPr as any).diNo,
            circle: item.circle,
            subcircle: item.subcircle,
            package: item.package,
            unit: item.unit,
            invoiceQty: item.invoiceQuantity || item.quantity,
            totalQty: item.totalInvoiceQuantity || item.totalInventory,
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
            packingList: [{ packType: 'BOX', quantity: item.invoiceQuantity || item.quantity || 0 }]
          }));
          await StoreInwardEntry.insertMany(inwardEntries, { session });
        }

        // Queue rebuild summary for imported items
        if (savedPr.lineItems && savedPr.lineItems.length > 0) {
          for (const item of savedPr.lineItems) {
            if (item.itemId) globalAffectedItemIds.add(item.itemId.toString());
          }
        }
      }));
    }

    } catch (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Import processed',
      data: { successCount, errors: [] }
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
      message: error.message || 'Failed to import Purchase Invoices',
      error: error.message,
    });
  }
};
