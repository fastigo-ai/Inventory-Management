import { Request, Response } from 'express';
import { PurchaseInvoice } from './purchaseInvoice.schema';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { PurchaseOrder } from './purchaseOrder.schema';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';
import Item from '../items/item.model';
import mongoose from 'mongoose';
import { SummaryService } from '../reports/summary/summary.service';

export const createPurchaseInvoice = async (req: Request, res: Response) => {
  try {
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
    const files = req.files as Express.Multer.File[];
    const attachments = files ? files.map(file => ({
      name: file.originalname,
      url: `/uploads/purchases/invoices/${file.filename}`
    })) : [];

    // Recalculate financials to prevent tampering
    let calculatedSubTotal = 0;
    const processedLineItems = parsedLineItems.map((item: any) => {
      const amount = (item.quantity || 0) * (item.rate || 0);
      calculatedSubTotal += amount;
      return {
        ...item,
        amount
      };
    });

    const discountAmount = (calculatedSubTotal * (data.discountPercentage || 0)) / 100;
    const taxableAmount = calculatedSubTotal - discountAmount;
    
    const cgstAmountVal = (taxableAmount * (Number(data.cgstPercentage) || 0)) / 100;
    const sgstAmountVal = (taxableAmount * (Number(data.sgstPercentage) || 0)) / 100;
    const igstAmountVal = (taxableAmount * (Number(data.igstPercentage) || 0)) / 100;

    const adjustment = Number(data.adjustment) || 0;
    const calculatedTotal = taxableAmount + cgstAmountVal + sgstAmountVal + igstAmountVal + adjustment;

    const newInvoice = new PurchaseInvoice({
      ...data,
      lineItems: processedLineItems,
      subTotal: calculatedSubTotal,
      discountAmount,
      total: calculatedTotal,
      status: data.status || 'Draft',
      attachments
    });

    await newInvoice.save();

    if (processedLineItems && processedLineItems.length > 0) {
      const inwardEntries = processedLineItems.map((item: any) => ({
        purchaseInvoiceId: newInvoice._id,
        purchaseOrderId: newInvoice.purchaseOrderId,
        poNumber: data.poNumber,
        poDate: data.poDate,
        billingFrom: data.billingFrom,
        vendorName: data.vendorName,
        invoiceNumber: newInvoice.invoiceNumber,
        invoiceDate: newInvoice.date,
        diRefNo: (newInvoice as any).diNumber,
        circle: item.circle,
        package: item.package,
        unit: item.unit,
        invoiceQty: item.quantity,
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
        packingList: [{ packType: 'BOX', quantity: item.quantity }] // default packing
      }));
      await StoreInwardEntry.insertMany(inwardEntries);
    }

    if (newInvoice.lineItems && newInvoice.lineItems.length > 0) {
      for (const item of newInvoice.lineItems) {
        if (item.itemId) SummaryService.rebuildForItem(item.itemId.toString()).catch(console.error);
      }
    }

    res.status(201).json({
      success: true,
      data: newInvoice,
      message: 'Purchase Invoice created successfully',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice Number already exists',
      });
    }
    console.error('Error creating Purchase Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Purchase Invoice',
      error: error.message,
    });
  }
};

export const getPurchaseInvoices = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const filter: any = {};

    if (user && user.role?.name === 'Store Manager') {
      const conditions = [];
      if (user.assignedPackage) {
        const normalizedPkg = user.assignedPackage.replace(/\s+/g, '');
        const regexStr = normalizedPkg.split('').map((char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
        const pkgRegex = { $regex: new RegExp(`^\\s*${regexStr}\\s*$`, 'i') };
        conditions.push({ 'lineItems.package': pkgRegex });
      }
      if (user.assignedCircle) {
        const circleRegex = { $regex: new RegExp(`^\\s*${user.assignedCircle.trim()}\\s*$`, 'i') };
        conditions.push({ 'lineItems.circle': circleRegex });
      }
      if (conditions.length > 0) {
        filter.$and = conditions;
      }
    }

    const invoices = await PurchaseInvoice.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Invoices',
      error: error.message,
    });
  }
};

export const getPurchaseInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await PurchaseInvoice.findById(id).populate('purchaseOrderId');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Invoice details',
      error: error.message,
    });
  }
};

export const updatePurchaseInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Parse lineItems if they come as string from multipart/form-data
    let parsedLineItems = data.lineItems;
    if (typeof parsedLineItems === 'string') {
      try {
        parsedLineItems = JSON.parse(parsedLineItems);
      } catch (e) {
        parsedLineItems = undefined;
      }
    }

    // Process attachments
    const files = req.files as Express.Multer.File[];
    let newAttachments: any[] = [];
    if (files && files.length > 0) {
      newAttachments = files.map(file => ({
        name: file.originalname,
        url: `/uploads/purchases/invoices/${file.filename}`
      }));
    }

    const existingInvoice = await PurchaseInvoice.findById(id);
    if (!existingInvoice) {
      return res.status(404).json({ success: false, message: 'Purchase Invoice not found' });
    }

    let calculatedTotal = existingInvoice.total;
    let calculatedSubTotal = existingInvoice.subTotal;
    let discountAmount = existingInvoice.discountAmount;
    let processedLineItems = existingInvoice.lineItems;

    if (parsedLineItems) {
      calculatedSubTotal = 0;
      processedLineItems = parsedLineItems.map((item: any) => {
        const amount = (item.quantity || 0) * (item.rate || 0);
        calculatedSubTotal += amount;
        return {
          ...item,
          amount
        };
      });

      discountAmount = (calculatedSubTotal * (data.discountPercentage ?? existingInvoice.discountPercentage ?? 0)) / 100;
      const taxableAmount = calculatedSubTotal - discountAmount;
      
      const cgstPercentage = data.cgstPercentage ?? existingInvoice.cgstPercentage ?? 0;
      const sgstPercentage = data.sgstPercentage ?? existingInvoice.sgstPercentage ?? 0;
      const igstPercentage = data.igstPercentage ?? existingInvoice.igstPercentage ?? 0;

      const cgstAmountVal = (taxableAmount * cgstPercentage) / 100;
      const sgstAmountVal = (taxableAmount * sgstPercentage) / 100;
      const igstAmountVal = (taxableAmount * igstPercentage) / 100;

      const adjustment = Number(data.adjustment ?? existingInvoice.adjustment ?? 0);
      calculatedTotal = taxableAmount + cgstAmountVal + sgstAmountVal + igstAmountVal + adjustment;
    }

    const updatedData: any = {
      ...data,
    };

    if (parsedLineItems) {
      updatedData.lineItems = processedLineItems;
      updatedData.subTotal = calculatedSubTotal;
      updatedData.discountAmount = discountAmount;
      updatedData.total = calculatedTotal;
    }

    if (newAttachments.length > 0) {
       updatedData.attachments = [...(existingInvoice.attachments || []), ...newAttachments];
    }

    const updatedInvoice = await PurchaseInvoice.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );
    
    // trigger save to run pre-save hooks for balance calculation
    if (updatedInvoice) {
        await updatedInvoice.save();
    }

    const oldItemIds = existingInvoice.lineItems?.map((li: any) => li.itemId?.toString()).filter(Boolean) || [];
    const newItemIds = updatedInvoice?.lineItems?.map((li: any) => li.itemId?.toString()).filter(Boolean) || [];
    const allAffectedItemIds = Array.from(new Set([...oldItemIds, ...newItemIds]));
    
    for (const itemId of allAffectedItemIds) {
      if (itemId) SummaryService.rebuildForItem(itemId).catch(console.error);
    }

    res.status(200).json({
      success: true,
      data: updatedInvoice,
      message: 'Purchase Invoice updated successfully',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice Number already exists',
      });
    }
    console.error('Error updating Purchase Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Purchase Invoice',
      error: error.message,
    });
  }
};

export const deletePurchaseInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedInvoice = await PurchaseInvoice.findByIdAndDelete(id);
    
    if (!deletedInvoice) {
      return res.status(404).json({ success: false, message: 'Purchase Invoice not found' });
    }

    if (deletedInvoice.lineItems && deletedInvoice.lineItems.length > 0) {
      for (const item of deletedInvoice.lineItems) {
        if (item.itemId) SummaryService.rebuildForItem(item.itemId.toString()).catch(console.error);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Purchase Invoice deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting Purchase Invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Purchase Invoice',
      error: error.message,
    });
  }
};

export const getNextPurchaseInvoiceNumber = async (req: Request, res: Response) => {
  try {
    const lastInvoice = await PurchaseInvoice.findOne({ invoiceNumber: { $regex: /^INV-/i } })
      .sort({ createdAt: -1 })
      .lean();
      
    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/^INV-(\d+)$/i);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        prefix: 'INV-',
        nextNumber: nextNumber.toString().padStart(5, '0')
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate next Invoice number',
      error: error.message,
    });
  }
};

export const updatePurchaseInvoiceReceiptStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { receiptStatus } = req.body;
    
    if (!['Pending Receipt', 'Received'].includes(receiptStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid receipt status' });
    }

    const invoice = await PurchaseInvoice.findByIdAndUpdate(
      id,
      { receiptStatus },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Purchase Invoice not found' });
    }

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Receipt status updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update receipt status',
      error: error.message
    });
  }
};

export const importPurchaseInvoices = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const parser = parseAndSanitizeCsv(req.file.buffer);
    const rows: any[] = [];
    const tempCodes = new Set<string>();
    const loaSerialNos = new Set<string>();
    const itemNames = new Set<string>();

    for await (const r of parser) {
      const row = r as any;
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

    // 2. Build piMap in-memory
    const piMap: Record<string, any> = {};

    for (const row of rows) {
      const invoiceNumber = row['InvoiceNumber'] || row['invoiceNumber'] || row['Invoice Number'];
      if (!invoiceNumber) continue;

      if (!piMap[invoiceNumber]) {
        piMap[invoiceNumber] = {
          invoiceNumber,
          _poNumber: row['PurchaseOrderNumber'] || row['purchaseOrderNumber'] || '',
          date: row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
          dueDate: row['DueDate'] || row['dueDate'],
          vendorName: row['VendorName'] || row['vendorName'],
          status: row['Status'] || row['status'] || 'Draft',
          gstType: row['GstType'] || row['gstType'] || 'Intra State',
          notes: row['Notes'] || row['notes'],
          lineItems: [],
        };
      }

      const itemName = row['ItemName'] || row['itemName'] || row['Item Name'];
      const poQuantity = Number(row['PoQuantity'] || row['poQuantity'] || 0);
      const quantity = Number(row['Quantity'] || row['quantity'] || 0);
      const rate = Number(row['Rate'] || row['rate'] || 0);
      const cgst = Number(row['Cgst'] || row['cgst'] || 0);
      const sgst = Number(row['Sgst'] || row['sgst'] || 0);
      const igst = Number(row['Igst'] || row['igst'] || 0);
      const tempCode = row['TempCode'] || row['tempCode'];
      const loaSerialNo = row['LoaSerialNo'] || row['loaSerialNo'];

      if (itemName) {
        const item = findItemInMemory(tempCode, loaSerialNo, itemName);
        const itemId = item ? item._id : null;

        piMap[invoiceNumber].lineItems.push({
          itemId,
          itemName,
          poQuantity,
          quantity,
          rate,
          cgst,
          sgst,
          igst
        });
      }
    }

    // 4. Pre-fetch existing PIs and POs
    const invoiceNumbers = Object.keys(piMap);
    const poNumbers = Array.from(new Set(invoiceNumbers.map(n => piMap[n]._poNumber).filter(Boolean)));

    const [existingPIs, existingPOs] = await Promise.all([
      PurchaseInvoice.find({ invoiceNumber: { $in: invoiceNumbers } }),
      poNumbers.length > 0 ? PurchaseOrder.find({ purchaseOrderNumber: { $in: poNumbers } }) : []
    ]);

    let successCount = 0;
    const errors: any[] = [];
    const globalAffectedItemIds = new Set<string>();
    
    for (const invoiceNumber of invoiceNumbers) {
      const piData = piMap[invoiceNumber];
      try {
        const existing = existingPIs.find(p => p.invoiceNumber === piData.invoiceNumber);

        if (piData._poNumber) {
          const po = existingPOs.find(p => p.purchaseOrderNumber === piData._poNumber);
          if (po) {
            piData.purchaseOrderId = po._id;
          } else {
            errors.push(`Purchase Order ${piData._poNumber} not found for Invoice ${piData.invoiceNumber}. It will be created without PO link.`);
          }
        }
        delete piData._poNumber;

        // Calculate financials
        let subTotal = 0;
        let totalTax = 0;

        piData.lineItems = piData.lineItems.map((item: any) => {
          const amount = item.quantity * item.rate;
          let taxAmount = 0;
          if (piData.gstType === 'Intra State') {
            taxAmount = amount * (item.cgst + item.sgst) / 100;
            item.igst = 0;
          } else if (piData.gstType === 'Inter State') {
            taxAmount = amount * item.igst / 100;
            item.cgst = 0;
            item.sgst = 0;
          }
          
          item.amount = amount;
          subTotal += amount;
          totalTax += taxAmount;
          return item;
        });

        piData.subTotal = subTotal;
        piData.taxAmount = totalTax;
        piData.total = subTotal + totalTax;
        piData.balanceDue = piData.total;

        if (existing) {
          const isLocked = existing.status === 'Paid';
          if (isLocked) {
            errors.push(`Invoice ${piData.invoiceNumber} already exists and is locked (status is Paid). Cannot update.`);
            continue;
          }

          const oldItemIds = existing.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);

          existing.date = piData.date;
          existing.dueDate = piData.dueDate;
          existing.vendorName = piData.vendorName;
          existing.status = piData.status;
          existing.gstType = piData.gstType;
          existing.notes = piData.notes;
          existing.subTotal = piData.subTotal;
          existing.taxAmount = piData.taxAmount;
          existing.total = piData.total;
          existing.balanceDue = piData.balanceDue;
          existing.lineItems = piData.lineItems;
          if (piData.purchaseOrderId) existing.purchaseOrderId = piData.purchaseOrderId;

          const updated = await existing.save();
          successCount++;

          const allAffectedItemIds = Array.from(new Set([
            ...oldItemIds,
            ...updated.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean)
          ]));

          for (const itemId of allAffectedItemIds) {
            globalAffectedItemIds.add(itemId);
          }
        } else {
          const createdInvoice = await PurchaseInvoice.create(piData);
          successCount++;

          if (createdInvoice.lineItems && createdInvoice.lineItems.length > 0) {
            for (const item of createdInvoice.lineItems) {
              if (item.itemId) globalAffectedItemIds.add(item.itemId.toString());
            }
          }
        }
      } catch (err: any) {
        errors.push(`Failed to import Invoice ${piData.invoiceNumber}: ${err.message}`);
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to import Purchase Invoices',
      error: error.message,
    });
  }
};

export const exportPurchaseInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await PurchaseInvoice.find().sort({ createdAt: -1 }).lean();

    const csvData = invoices.flatMap(inv => 
      inv.lineItems && inv.lineItems.length > 0 ? inv.lineItems.map((item: any) => ({
        InvoiceNumber: inv.invoiceNumber,
        PurchaseOrderNumber: inv.purchaseOrderNumber || '',
        Date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : '',
        DueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
        VendorName: inv.vendorName,
        Status: inv.status,
        BillingFrom: inv.billingCompany?.name || '',
        ItemName: item.itemName,
        Description: item.description || '',
        HSNCode: item.hsnCode || '',
        Quantity: item.quantity || 0,
        Rate: item.rate || 0,
        Amount: item.amount || 0,
        Total: inv.total || 0,
        BalanceDue: inv.balanceDue || 0
      })) : [{
        InvoiceNumber: inv.invoiceNumber,
        PurchaseOrderNumber: inv.purchaseOrderNumber || '',
        Date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : '',
        DueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
        VendorName: inv.vendorName,
        Status: inv.status,
        BillingFrom: inv.billingCompany?.name || '',
        ItemName: '', Description: '', HSNCode: '', Quantity: '', Rate: '', Amount: '', Total: '', BalanceDue: ''
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
