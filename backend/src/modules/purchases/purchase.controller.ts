import { Request, Response } from 'express';
import { PurchaseOrder } from './purchaseOrder.schema';
import { Pr } from './pr.schema';
import { DI } from '../di/di.schema';
import Item from '../items/item.model';
import { parseAndSanitizeCsv } from '../../utils/csv.util';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';

import { SummaryService } from '../reports/summary/summary.service';

export const createPurchaseOrder = async (req: Request, res: Response) => {
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

    // Parse deliveryAddresses if it comes as string
    let parsedDeliveryAddresses = data.deliveryAddresses || [];
    if (typeof parsedDeliveryAddresses === 'string') {
      try {
        parsedDeliveryAddresses = JSON.parse(parsedDeliveryAddresses);
      } catch (e) {
        parsedDeliveryAddresses = [];
      }
    }

    // Parse paymentTerms if it comes as string
    let parsedPaymentTerms = data.paymentTerms;
    if (typeof parsedPaymentTerms === 'string') {
      try {
        parsedPaymentTerms = JSON.parse(parsedPaymentTerms);
      } catch (e) {
        parsedPaymentTerms = undefined;
      }
    }


    // Parse billingCompany if it comes as string from multipart/form-data
    let parsedBillingCompany = data.billingCompany;
    if (typeof parsedBillingCompany === 'string') {
      try {
        parsedBillingCompany = JSON.parse(parsedBillingCompany);
      } catch (e) {
        parsedBillingCompany = undefined;
      }
    }

    // Process attachments
    const files = req.files as Express.Multer.File[];
    const attachments = files ? files.map(file => ({
      name: file.originalname,
      url: `/uploads/purchases/${file.filename}`
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
    
    let freightAmount = 0;
    if (data.freightInsuranceType === 'Exclusive') {
      if (data.freightInsuranceValueType === 'Percentage') {
        freightAmount = ((calculatedSubTotal - discountAmount) * (data.freightInsuranceAmount || 0)) / 100;
      } else {
        freightAmount = Number(data.freightInsuranceAmount || 0);
      }
    }

    const taxableAmountForGst = calculatedSubTotal - discountAmount + freightAmount;
    const cgstPercentageVal = Number(data.cgstPercentage) || 0;
    const sgstPercentageVal = Number(data.sgstPercentage) || 0;
    const igstPercentageVal = Number(data.igstPercentage) || 0;
    
    const cgstAmountVal = (taxableAmountForGst * cgstPercentageVal) / 100;
    const sgstAmountVal = (taxableAmountForGst * sgstPercentageVal) / 100;
    const igstAmountVal = (taxableAmountForGst * igstPercentageVal) / 100;

    const taxAmount = ((calculatedSubTotal - discountAmount) * (data.taxPercentage || 0)) / 100;
    const adjustment = data.adjustment || 0;
    
    // Total = Subtotal - Discount + Freight + CGST + SGST + IGST +/- TDS/TCS + Adjustment
    const taxType = data.taxType || 'TDS';
    const taxAmountValue = taxType === 'TCS' ? taxAmount : -taxAmount;
    const calculatedTotal = calculatedSubTotal - discountAmount + freightAmount + cgstAmountVal + sgstAmountVal + igstAmountVal + taxAmountValue + adjustment;

    const newPurchaseOrder = new PurchaseOrder({
      ...data,
      cgstPercentage: cgstPercentageVal,
      sgstPercentage: sgstPercentageVal,
      igstPercentage: igstPercentageVal,
      lineItems: processedLineItems,
      deliveryAddresses: parsedDeliveryAddresses,
      paymentTerms: parsedPaymentTerms !== undefined ? parsedPaymentTerms : data.paymentTerms,
      subTotal: calculatedSubTotal,
      discountAmount,
      taxAmount,
      total: calculatedTotal,
      status: data.status || 'Draft',
      attachments
    });

    await newPurchaseOrder.save();

    if (newPurchaseOrder.lineItems && newPurchaseOrder.lineItems.length > 0) {
      for (const item of newPurchaseOrder.lineItems) {
        if (item.itemId) SummaryService.rebuildForItem(item.itemId.toString()).catch(console.error);
      }
    }

    res.status(201).json({
      success: true,
      data: newPurchaseOrder,
      message: 'Purchase Order created successfully',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Purchase Order Number already exists',
      });
    }
    console.error('Error creating Purchase Order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create Purchase Order',
      error: error.message,
    });
  }
};

export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.vendorName) {
      filter.vendorName = req.query.vendorName;
    }
    const orders = await PurchaseOrder.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Orders',
      error: error.message,
    });
  }
};

export const getPurchaseOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await PurchaseOrder.findById(id).lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found',
      });
    }

    // Check if locked
    const prCount = await Pr.countDocuments({ purchaseOrderId: id });
    const diCount = await DI.countDocuments({ purchaseOrderId: id });
    const isLocked = prCount > 0 || diCount > 0;

    res.status(200).json({
      success: true,
      data: {
        ...order,
        isLocked
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Order details',
      error: error.message,
    });
  }
};

export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Check if locked
    const prCount = await Pr.countDocuments({ purchaseOrderId: id });
    const diCount = await DI.countDocuments({ purchaseOrderId: id });
    if (prCount > 0 || diCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit this Purchase Order because it already has linked Invoices or Dispatch Instructions.',
      });
    }
    
    try {
      require('fs').writeFileSync('c:/Users/sanjeet kumar/Desktop/DoortwoFy/erp-system/backend/debug.txt', 'I AM HERE: ' + new Date().toISOString());
    } catch (e) {}

    // Parse lineItems if they come as string from multipart/form-data
    let parsedLineItems = data.lineItems || [];
    if (typeof parsedLineItems === 'string') {
      try {
        parsedLineItems = JSON.parse(parsedLineItems);
      } catch (e) {
        parsedLineItems = [];
      }
    } else if (Array.isArray(parsedLineItems) && typeof parsedLineItems[0] === 'string') {
      try {
        parsedLineItems = JSON.parse(parsedLineItems[0]);
      } catch (e) {
        parsedLineItems = [];
      }
    }
    if (!Array.isArray(parsedLineItems)) parsedLineItems = [];

    // Parse deliveryAddresses if it comes as string
    let parsedDeliveryAddresses = data.deliveryAddresses || [];
    if (typeof parsedDeliveryAddresses === 'string') {
      try {
        parsedDeliveryAddresses = JSON.parse(parsedDeliveryAddresses);
      } catch (e) {
        parsedDeliveryAddresses = [];
      }
    } else if (Array.isArray(parsedDeliveryAddresses) && typeof parsedDeliveryAddresses[0] === 'string') {
      try {
        parsedDeliveryAddresses = JSON.parse(parsedDeliveryAddresses[0]);
      } catch (e) {
        parsedDeliveryAddresses = [];
      }
    }
    if (!Array.isArray(parsedDeliveryAddresses)) parsedDeliveryAddresses = [];

    // Parse paymentTerms if it comes as string
    let parsedPaymentTerms = data.paymentTerms;
    if (typeof parsedPaymentTerms === 'string') {
      try {
        parsedPaymentTerms = JSON.parse(parsedPaymentTerms);
      } catch (e) {
        parsedPaymentTerms = undefined;
      }
    } else if (Array.isArray(parsedPaymentTerms) && typeof parsedPaymentTerms[0] === 'string') {
      try {
        parsedPaymentTerms = JSON.parse(parsedPaymentTerms[0]);
      } catch (e) {
        parsedPaymentTerms = undefined;
      }
    }
    if (parsedPaymentTerms !== undefined && !Array.isArray(parsedPaymentTerms)) {
      parsedPaymentTerms = undefined;
    }

    // Parse attachments if it comes as string
    let parsedAttachments = data.attachments || [];
    if (typeof parsedAttachments === 'string') {
      try {
        parsedAttachments = JSON.parse(parsedAttachments);
      } catch (e) {
        parsedAttachments = [];
      }
    } else if (Array.isArray(parsedAttachments) && typeof parsedAttachments[0] === 'string') {
      try {
        parsedAttachments = JSON.parse(parsedAttachments[0]);
      } catch (e) {
        parsedAttachments = [];
      }
    }
    if (!Array.isArray(parsedAttachments)) parsedAttachments = [];

    // Process attachments
    const files = req.files as Express.Multer.File[];
    let newAttachments: any[] = [];
    if (files && files.length > 0) {
      newAttachments = files.map(file => ({
        name: file.originalname,
        url: `/uploads/purchases/${file.filename}`
      }));
    }

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
    
    let freightAmount = 0;
    if (data.freightInsuranceType === 'Exclusive') {
      if (data.freightInsuranceValueType === 'Percentage') {
        freightAmount = ((calculatedSubTotal - discountAmount) * (data.freightInsuranceAmount || 0)) / 100;
      } else {
        freightAmount = Number(data.freightInsuranceAmount || 0);
      }
    }

    const taxableAmountForGst = calculatedSubTotal - discountAmount + freightAmount;
    const cgstPercentageVal = Number(data.cgstPercentage) || 0;
    const sgstPercentageVal = Number(data.sgstPercentage) || 0;
    const igstPercentageVal = Number(data.igstPercentage) || 0;
    
    const cgstAmountVal = (taxableAmountForGst * cgstPercentageVal) / 100;
    const sgstAmountVal = (taxableAmountForGst * sgstPercentageVal) / 100;
    const igstAmountVal = (taxableAmountForGst * igstPercentageVal) / 100;

    const taxAmount = ((calculatedSubTotal - discountAmount) * (data.taxPercentage || 0)) / 100;
    const adjustment = Number(data.adjustment || 0);
    
    // Total = Subtotal - Discount + Freight + CGST + SGST + IGST +/- TDS/TCS + Adjustment
    const taxType = data.taxType || 'TDS';
    const taxAmountValue = taxType === 'TCS' ? taxAmount : -taxAmount;
    const calculatedTotal = calculatedSubTotal - discountAmount + freightAmount + cgstAmountVal + sgstAmountVal + igstAmountVal + taxAmountValue + adjustment;

    // Parse billingCompany if it comes as string from multipart/form-data
    let parsedBillingCompany = data.billingCompany;
    if (typeof parsedBillingCompany === 'string') {
      try {
        parsedBillingCompany = JSON.parse(parsedBillingCompany);
      } catch (e) {
        parsedBillingCompany = undefined;
      }
    }

    const existingOrder = await PurchaseOrder.findById(id);
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    const updatedData: any = {
      ...data,
      billingCompany: parsedBillingCompany !== undefined ? parsedBillingCompany : existingOrder.billingCompany,
      cgstPercentage: cgstPercentageVal,
      sgstPercentage: sgstPercentageVal,
      igstPercentage: igstPercentageVal,
      lineItems: processedLineItems,
      deliveryAddresses: parsedDeliveryAddresses,
      paymentTerms: parsedPaymentTerms !== undefined ? parsedPaymentTerms : existingOrder.paymentTerms,
      attachments: parsedAttachments,
      subTotal: calculatedSubTotal,
      discountAmount,
      taxAmount,
      total: calculatedTotal,
      status: data.status || existingOrder.status,
    };
    
    // Remove immutable fields that might come from the frontend
    delete updatedData._id;
    delete updatedData.__v;
    delete updatedData.createdAt;
    delete updatedData.updatedAt;
    
    if (newAttachments.length > 0) {
       updatedData.attachments = [...parsedAttachments, ...newAttachments];
    }
    
    try {
      const updatedOrder = await PurchaseOrder.findByIdAndUpdate(id, updatedData, { new: true });
      
      const oldItemIds = existingOrder.lineItems?.map((li: any) => li.itemId?.toString()).filter(Boolean) || [];
      const newItemIds = updatedOrder?.lineItems?.map((li: any) => li.itemId?.toString()).filter(Boolean) || [];
      const allAffectedItemIds = Array.from(new Set([...oldItemIds, ...newItemIds]));
      
      for (const itemId of allAffectedItemIds) {
        if (itemId) SummaryService.rebuildForItem(itemId).catch(console.error);
      }

      return res.status(200).json({ success: true, message: 'Purchase Order updated successfully', data: updatedOrder });
    } catch (dbError: any) {
      console.error('Database Error in updatePurchaseOrder:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update Purchase Order', 
        error: dbError.message,
        debug: {
          // Send all the types directly back to us so we can see what's actually happening
          parsedPaymentTermsIsArray: Array.isArray(parsedPaymentTerms),
          parsedPaymentTermsTypeof: typeof parsedPaymentTerms,
          parsedPaymentTermsValue: parsedPaymentTerms,
          updatedDataPaymentTermsIsArray: Array.isArray(updatedData.paymentTerms),
          updatedDataPaymentTermsTypeof: typeof updatedData.paymentTerms,
          updatedDataPaymentTermsValue: updatedData.paymentTerms
        }
      });
    }

  } catch (error: any) {
    console.error('Error updating Purchase Order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update Purchase Order',
      error: error.message,
    });
  }
};

export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if locked
    const prCount = await Pr.countDocuments({ purchaseOrderId: id });
    const diCount = await DI.countDocuments({ purchaseOrderId: id });
    if (prCount > 0 || diCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete this Purchase Order because it already has linked Invoices or Dispatch Instructions.',
      });
    }

    const deletedOrder = await PurchaseOrder.findByIdAndDelete(id);
    
    if (!deletedOrder) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    if (deletedOrder.lineItems && deletedOrder.lineItems.length > 0) {
      for (const item of deletedOrder.lineItems) {
        if (item.itemId) SummaryService.rebuildForItem(item.itemId.toString()).catch(console.error);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Purchase Order deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting Purchase Order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Purchase Order',
      error: error.message,
    });
  }
};

export const getNextPurchaseOrderNumber = async (req: Request, res: Response) => {
  try {
    const lastOrder = await PurchaseOrder.findOne({ purchaseOrderNumber: { $regex: /^PO-/i } })
      .sort({ createdAt: -1 })
      .lean();
      
    let nextNumber = 1;
    if (lastOrder && lastOrder.purchaseOrderNumber) {
      const match = lastOrder.purchaseOrderNumber.match(/^PO-(\d+)$/i);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        prefix: 'PO-',
        nextNumber: nextNumber.toString().padStart(5, '0')
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate next PO number',
      error: error.message,
    });
  }
};

export const exportPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const orders = await PurchaseOrder.find().sort({ createdAt: -1 }).lean();
    
    const rows: any[] = [];
    for (const order of orders) {
      const billedFrom = order.billingCompany?.name || '';
      if (!order.lineItems || order.lineItems.length === 0) {
        rows.push({
          PurchaseOrderNumber: order.purchaseOrderNumber,
          VendorName: order.vendorName,
          Date: order.date,
          Location: order.location,
          ItemName: '',
          Quantity: '',
          Rate: '',
          Status: order.status,
          BilledFrom: billedFrom
        });
      } else {
        for (const item of order.lineItems) {
          rows.push({
            PurchaseOrderNumber: order.purchaseOrderNumber,
            VendorName: order.vendorName,
            Date: order.date,
            Location: order.location,
            ItemName: item.itemName || '',
            Quantity: item.quantity || 0,
            Rate: item.rate || 0,
            Status: order.status,
            BilledFrom: billedFrom
          });
        }
      }
    }

    const headers = ['PurchaseOrderNumber', 'VendorName', 'Date', 'Location', 'ItemName', 'Quantity', 'Rate', 'Status', 'BilledFrom'];
    const csv = stringify(rows, { header: true, columns: headers });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="purchase_orders_export.csv"');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to export Purchase Orders',
      error: error.message,
    });
  }
};

export const importPurchaseOrders = async (req: Request, res: Response) => {
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

    // 2. Build ordersMap in-memory
    const ordersMap: Record<string, any> = {};

    for (const row of rows) {
      const poNumber = row['PurchaseOrderNumber'] || row['purchaseOrderNumber'] || row['Purchase Order Number'];
      if (!poNumber) continue;

      if (!ordersMap[poNumber]) {
        ordersMap[poNumber] = {
          purchaseOrderNumber: poNumber,
          vendorName: row['VendorName'] || row['vendorName'] || 'Unknown Vendor',
          date: row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
          deliveryDate: row['DeliveryDate'] || row['deliveryDate'],
          location: row['Location'] || row['location'] || 'Head Office',
          status: row['Status'] || row['status'] || 'Draft',
          reference: row['Reference'] || row['reference'],
          deliveryAddressType: row['DeliveryAddressType'] || row['deliveryAddressType'] || 'Locations',
          deliveryAddressId: row['DeliveryAddressId'] || row['deliveryAddressId'] || 'Head Office',
          paymentTerms: row['PaymentTerms'] ? [{ stage: 'Delivery', type: 'Fixed', value: row['PaymentTerms'], unit: 'Days' }] : [],
          circle: row['Circle'] || row['circle'],
          package: row['Package'] || row['package'],
          shipmentPreference: row['ShipmentPreference'] || row['shipmentPreference'],
          warehouseLocation: row['WarehouseLocation'] || row['warehouseLocation'] || 'Head Office',
          notes: row['Notes'] || row['notes'],
          termsConditions: row['TermsConditions'] || row['termsConditions'],
          cgstPercentage: Number(row['CGSTPercentage'] || row['cgstPercentage'] || 0),
          sgstPercentage: Number(row['SGSTPercentage'] || row['sgstPercentage'] || 0),
          igstPercentage: Number(row['IGSTPercentage'] || row['igstPercentage'] || 0),
          taxType: 'TDS',
          taxPercentage: 0,
          discountPercentage: 0,
          adjustment: 0,
          lineItems: [],
        };
      }

      const itemName = row['ItemName'] || row['itemName'] || row['Item Name'];
      const quantity = Number(row['Quantity'] || row['quantity'] || 1);
      const rate = Number(row['Rate'] || row['rate'] || 0);
      const tempCode = row['TempCode'] || row['tempCode'];
      const account = row['Account'] || row['account'];
      const description = row['Description'] || row['description'];
      const loaSerialNo = row['LoaSerialNo'] || row['loaSerialNo'];
      const hsnCode = row['HsnCode'] || row['hsnCode'];
      const itemPackage = row['ItemPackage'] || row['itemPackage'];
      const itemCircle = row['ItemCircle'] || row['itemCircle'];
      const unit = row['Unit'] || row['unit'];

      if (itemName) {
        const item = findItemInMemory(tempCode, loaSerialNo, itemName);
        const itemId = item ? item._id : null;

        ordersMap[poNumber].lineItems.push({
          itemId,
          itemName,
          tempCode,
          account,
          description,
          loaSerialNo,
          hsnCode,
          package: itemPackage,
          circle: itemCircle,
          unit,
          quantity,
          rate,
          amount: quantity * rate
        });
      }
    }

    const ordersToInsert = [];
    
    for (const poNumber of Object.keys(ordersMap)) {
      const order = ordersMap[poNumber];
      
      let calculatedSubTotal = 0;
      order.lineItems.forEach((item: any) => {
        calculatedSubTotal += item.amount;
      });
      
      const discountAmount = 0;
      const taxAmount = 0;
      const cgstAmount = (calculatedSubTotal * (order.cgstPercentage || 0)) / 100;
      const sgstAmount = (calculatedSubTotal * (order.sgstPercentage || 0)) / 100;
      const igstAmount = (calculatedSubTotal * (order.igstPercentage || 0)) / 100;
      const adjustment = 0;
      const calculatedTotal = calculatedSubTotal - discountAmount - taxAmount + cgstAmount + sgstAmount + igstAmount + adjustment;
      
      order.subTotal = calculatedSubTotal;
      order.discountAmount = discountAmount;
      order.taxAmount = taxAmount;
      order.total = calculatedTotal;
      
      ordersToInsert.push(order);
    }

    // 4. Pre-fetch existing POs
    const poNumbers = ordersToInsert.map(o => o.purchaseOrderNumber);
    const existingPOs = await PurchaseOrder.find({ purchaseOrderNumber: { $in: poNumbers } });
    
    let successCount = 0;
    const errors: any[] = [];
    
    for (const orderData of ordersToInsert) {
       try {
         const existing = existingPOs.find(p => p.purchaseOrderNumber === orderData.purchaseOrderNumber);
         if (existing) {
           const prCount = await Pr.countDocuments({ purchaseOrderId: existing._id });
           const diCount = await DI.countDocuments({ purchaseOrderId: existing._id });
           const isLocked = prCount > 0 || diCount > 0;
           if (isLocked) {
             errors.push(`PO ${orderData.purchaseOrderNumber} already exists and is locked (has associated Invoices or DIs). Cannot update.`);
             continue;
           }

           const oldItemIds = existing.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean);

           existing.vendorName = orderData.vendorName;
           existing.date = orderData.date;
           existing.deliveryDate = orderData.deliveryDate;
           existing.location = orderData.location;
           existing.status = orderData.status;
           existing.reference = orderData.reference;
           existing.deliveryAddressType = orderData.deliveryAddressType;
           existing.deliveryAddressId = orderData.deliveryAddressId;
           existing.paymentTerms = orderData.paymentTerms;
           existing.circle = orderData.circle;
           existing.package = orderData.package;
           existing.shipmentPreference = orderData.shipmentPreference;
           existing.warehouseLocation = orderData.warehouseLocation;
           existing.notes = orderData.notes;
           existing.termsConditions = orderData.termsConditions;
           existing.cgstPercentage = orderData.cgstPercentage;
           existing.sgstPercentage = orderData.sgstPercentage;
           existing.igstPercentage = orderData.igstPercentage;
           existing.subTotal = orderData.subTotal;
           existing.discountAmount = orderData.discountAmount;
           existing.taxAmount = orderData.taxAmount;
           existing.total = orderData.total;
           existing.lineItems = orderData.lineItems;

           const updated = await existing.save();
           successCount++;

           const allAffectedItemIds = Array.from(new Set([
             ...oldItemIds,
             ...updated.lineItems.map((li: any) => li.itemId?.toString()).filter(Boolean)
           ]));

           for (const itemId of allAffectedItemIds) {
             SummaryService.rebuildForItem(itemId).catch(console.error);
           }
         } else {
           const createdOrder = await PurchaseOrder.create(orderData);
           successCount++;
           
           if (createdOrder.lineItems && createdOrder.lineItems.length > 0) {
             for (const item of createdOrder.lineItems) {
               if (item.itemId) SummaryService.rebuildForItem(item.itemId.toString()).catch(console.error);
             }
           }
         }
       } catch (err: any) {
         errors.push(`Failed to import PO ${orderData.purchaseOrderNumber}: ${err.message}`);
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
      message: 'Failed to import Purchase Orders',
      error: error.message,
    });
  }
};

