import { Request, Response } from 'express';
import { PurchaseOrder } from './purchaseOrder.schema';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';

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
    const taxAmount = ((calculatedSubTotal - discountAmount) * (data.taxPercentage || 0)) / 100;
    const adjustment = data.adjustment || 0;
    
    // Total = Subtotal - Discount - Tax + Adjustment
    // Note: Depends on whether TDS/TCS is subtracted or added. Usually TDS is deducted from payment, 
    // but in PO total value, it depends on business logic. Let's assume minus for TDS/TCS for now.
    const calculatedTotal = calculatedSubTotal - discountAmount - taxAmount + adjustment;

    const newPurchaseOrder = new PurchaseOrder({
      ...data,
      lineItems: processedLineItems,
      subTotal: calculatedSubTotal,
      discountAmount,
      taxAmount,
      total: calculatedTotal,
      status: data.status || 'Draft',
      attachments
    });

    await newPurchaseOrder.save();

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
      message: 'Failed to create Purchase Order',
      error: error.message,
    });
  }
};

export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const orders = await PurchaseOrder.find().sort({ createdAt: -1 });
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
    const order = await PurchaseOrder.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Purchase Order details',
      error: error.message,
    });
  }
};

export const exportPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const orders = await PurchaseOrder.find().sort({ createdAt: -1 }).lean();
    
    const rows: any[] = [];
    for (const order of orders) {
      if (!order.lineItems || order.lineItems.length === 0) {
        rows.push({
          PurchaseOrderNumber: order.purchaseOrderNumber,
          VendorName: order.vendorName,
          Date: order.date,
          Location: order.location,
          ItemName: '',
          Quantity: '',
          Rate: '',
          Status: order.status
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
            Status: order.status
          });
        }
      }
    }

    const headers = ['PurchaseOrderNumber', 'VendorName', 'Date', 'Location', 'ItemName', 'Quantity', 'Rate', 'Status'];
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

    const parser = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const ordersMap: Record<string, any> = {};

    for await (const row of parser) {
      const poNumber = row['PurchaseOrderNumber'] || row['purchaseOrderNumber'] || row['Purchase Order Number'];
      if (!poNumber) continue;

      if (!ordersMap[poNumber]) {
        ordersMap[poNumber] = {
          purchaseOrderNumber: poNumber,
          vendorName: row['VendorName'] || row['vendorName'] || 'Unknown Vendor',
          date: row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
          location: row['Location'] || row['location'] || 'Head Office',
          status: row['Status'] || row['status'] || 'Draft',
          lineItems: [],
          deliveryAddressType: 'Locations',
          deliveryAddressId: 'Head Office',
          paymentTerms: 'Due on Receipt',
          circle: 'Package 1(S/N)',
          warehouseLocation: 'Head Office',
          taxType: 'TDS',
          taxPercentage: 0,
          discountPercentage: 0,
          adjustment: 0
        };
      }

      const itemName = row['ItemName'] || row['itemName'] || row['Item Name'];
      const quantity = Number(row['Quantity'] || row['quantity'] || 1);
      const rate = Number(row['Rate'] || row['rate'] || 0);

      if (itemName) {
        ordersMap[poNumber].lineItems.push({
          itemName,
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
      const adjustment = 0;
      const calculatedTotal = calculatedSubTotal - discountAmount - taxAmount + adjustment;
      
      order.subTotal = calculatedSubTotal;
      order.discountAmount = discountAmount;
      order.taxAmount = taxAmount;
      order.total = calculatedTotal;
      
      ordersToInsert.push(order);
    }
    
    let successCount = 0;
    const errors: any[] = [];
    
    for (const orderData of ordersToInsert) {
       try {
         const existing = await PurchaseOrder.findOne({ purchaseOrderNumber: orderData.purchaseOrderNumber });
         if (existing) {
           errors.push(`PO ${orderData.purchaseOrderNumber} already exists.`);
           continue;
         }
         await PurchaseOrder.create(orderData);
         successCount++;
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

