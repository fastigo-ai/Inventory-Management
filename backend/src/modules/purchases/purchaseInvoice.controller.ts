import { Request, Response } from 'express';
import { PurchaseInvoice } from './purchaseInvoice.schema';
import { parse } from 'csv-parse/sync';
import { PurchaseOrder } from './purchaseOrder.schema';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';

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

    const parser = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const piMap: Record<string, any> = {};

    for await (const r of parser) {
      const row = r as any;
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

      if (itemName) {
        piMap[invoiceNumber].lineItems.push({
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

    let successCount = 0;
    const errors: any[] = [];
    
    for (const invoiceNumber of Object.keys(piMap)) {
      const piData = piMap[invoiceNumber];
      try {
        const existing = await PurchaseInvoice.findOne({ invoiceNumber: piData.invoiceNumber });
        if (existing) {
          errors.push(`Purchase Invoice ${piData.invoiceNumber} already exists.`);
          continue;
        }

        if (piData._poNumber) {
          const po = await PurchaseOrder.findOne({ purchaseOrderNumber: piData._poNumber });
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

        await PurchaseInvoice.create(piData);
        successCount++;
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
