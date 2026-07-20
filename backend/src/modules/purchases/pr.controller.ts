import { Request, Response } from 'express';
import { Pr } from './pr.schema';
import { PurchaseOrder } from './purchaseOrder.schema';

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
      Pr.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Pr.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        prs,
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
    const pr = await Pr.findById(id);

    if (!pr) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: pr
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
    
    const updatedPr = await Pr.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedPr) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
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
    
    const deletedPr = await Pr.findByIdAndDelete(id);
    
    if (!deletedPr) {
      res.status(404).json({
        success: false,
        message: 'Purchase Invoice not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Purchase Invoice deleted successfully'
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
