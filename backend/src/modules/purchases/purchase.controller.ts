import { Request, Response } from 'express';
import { PurchaseOrder } from './purchaseOrder.schema';

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
