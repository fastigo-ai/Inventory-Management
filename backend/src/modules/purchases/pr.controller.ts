import { Request, Response } from 'express';
import { Pr } from './pr.schema';
import { PurchaseOrder } from './purchaseOrder.schema';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { StoreInwardEntry } from '../store/storeInwardEntry.schema';

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

    const [prs, total] = await Promise.all([
      Pr.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Pr.countDocuments()
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
      r.lineItems && r.lineItems.length > 0 ? r.lineItems.map(item => ({
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
        TotalAmount: item.totalAmount || 0
      })) : [{
        PurchaseInvoiceNumber: r.purchaseReceiveNumber,
        PurchaseOrderNumber: r.purchaseOrderNumber || '',
        Date: r.receiveDate ? new Date(r.receiveDate).toISOString().split('T')[0] : '',
        VendorName: r.vendorName,
        Status: r.status,
        DINo: r.diNo || '',
        Billed: r.billed ? 'Yes' : 'No',
        ItemName: '', TempCode: '', POQuantity: '', InvoiceQuantity: '', Rate: '', Amount: '', CGST: '', SGST: '', IGST: '', TotalAmount: ''
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

    const parser = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const prMap: Record<string, any> = {};

    for await (const row of parser) {
      const prNumber = row['PurchaseInvoiceNumber'] || row['PurchaseReceiveNumber'] || row['purchaseReceiveNumber'];
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

      const itemName = row['ItemName'] || row['itemName'];
      if (itemName) {
        prMap[prNumber].lineItems.push({
          itemName,
          tempCode: row['TempCode'] || row['tempCode'] || '',
          poQuantity: Number(row['POQuantity'] || row['poQuantity'] || 0),
          invoiceQuantity: Number(row['InvoiceQuantity'] || row['invoiceQuantity'] || 0),
          rate: Number(row['Rate'] || row['rate'] || 0),
          amount: Number(row['Amount'] || row['amount'] || 0),
          cgst: Number(row['CGST'] || row['cgst'] || 0),
          sgst: Number(row['SGST'] || row['sgst'] || 0),
          igst: Number(row['IGST'] || row['igst'] || 0),
          totalAmount: Number(row['TotalAmount'] || row['totalAmount'] || 0)
        });
      }
    }

    let successCount = 0;
    const errors: any[] = [];
    
    for (const prNumber of Object.keys(prMap)) {
      const prData = prMap[prNumber];
      try {
        const existing = await Pr.findOne({ purchaseReceiveNumber: prData.purchaseReceiveNumber });
        if (existing) {
          errors.push(`Purchase Invoice ${prData.purchaseReceiveNumber} already exists.`);
          continue;
        }

        if (prData.purchaseOrderNumber) {
          const po = await PurchaseOrder.findOne({ purchaseOrderNumber: prData.purchaseOrderNumber });
          if (po) {
            prData.purchaseOrderId = po._id;
          }
        }

        await Pr.create(prData);
        successCount++;
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to import Purchase Invoices',
      error: error.message,
    });
  }
};
