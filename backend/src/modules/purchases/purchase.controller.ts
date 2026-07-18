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

export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
      subTotal: calculatedSubTotal,
      discountAmount,
      taxAmount,
      total: calculatedTotal,
      status: data.status || existingOrder.status,
    };
    
    if (newAttachments.length > 0) {
       updatedData.attachments = [...(existingOrder.attachments || []), ...newAttachments];
    }

    const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedPurchaseOrder,
      message: 'Purchase Order updated successfully',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Purchase Order Number already exists',
      });
    }
    console.error('Error updating Purchase Order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Purchase Order',
      error: error.message,
    });
  }
};

export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedOrder = await PurchaseOrder.findByIdAndDelete(id);
    
    if (!deletedOrder) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
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

