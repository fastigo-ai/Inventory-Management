import { Request, Response } from 'express';
import { ContractorInvoice } from './contractorInvoice.schema';
import { ContractorBillingLedger } from './contractorBillingLedger.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { asyncHandler } from '../../core/utils/asyncHandler';

// Helper to generate Invoice Number
const generateInvoiceNumber = async () => {
  const count = await ContractorInvoice.countDocuments();
  return `INV/CB/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
};

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { 
    contractorId, 
    workOrderId, 
    stage, 
    mhrovId, 
    jmcId, 
    handoverCertificateId, 
    supplyBasis, 
    lineItems,
    jmcDocUrl,
    signedBillDocUrl
  } = req.body;
  
  const user = (req as any).user;

  const invoiceNumber = await generateInvoiceNumber();

  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  const percentage = parseInt(stage.replace('%', '')); // '10%', '20%', '100%'

  const processedItems = lineItems.map((item: any) => {
    let baseAmount = 0;
    
    // For 100% stage, we use jmcDoneQty. For others, we use erectedQty * percentage.
    if (percentage === 100) {
      baseAmount = Number(item.jmcDoneQty) * Number(item.rate);
    } else {
      baseAmount = Number(item.erectedQty) * Number(item.rate) * (percentage / 100);
    }

    const gstAmount = baseAmount * (Number(item.gstRate || 0) / 100);
    const totalAmount = baseAmount + gstAmount;

    totalBaseAmount += baseAmount;
    totalGstAmount += gstAmount;

    return {
      itemId: item.itemId,
      activity: item.activity,
      description: item.description,
      billingCategory: item.billingCategory,
      jmcDoneQty: Number(item.jmcDoneQty || 0),
      erectedQty: Number(item.erectedQty || 0),
      rate: Number(item.rate),
      percentageApplied: percentage,
      baseAmount,
      gstRate: Number(item.gstRate || 0),
      gstAmount,
      totalAmount
    };
  });

  const invoice = await ContractorInvoice.create({
    invoiceNumber,
    contractorId,
    workOrderId,
    stage,
    mhrovId,
    jmcId,
    handoverCertificateId,
    supplyBasis,
    lineItems: processedItems,
    totalBaseAmount,
    totalGstAmount,
    grandTotal: totalBaseAmount + totalGstAmount,
    jmcDocUrl,
    signedBillDocUrl,
    status: 'Pending PM Approval',
    createdBy: user._id
  });

  res.status(201).json(new ApiResponse(201, invoice, 'Contractor Invoice created successfully'));
});

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = user.contractorId;
  }

  const invoices = await ContractorInvoice.find(filter)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, invoices, 'Invoices fetched successfully'));
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await ContractorInvoice.findById(id)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber')
    .populate('mhrovId', 'mhrovNumber')
    .populate('jmcId', 'jmcNumber')
    .populate('handoverCertificateId', 'certificateNumber');

  if (!invoice) throw new ApiError(404, 'Invoice not found');

  res.status(200).json(new ApiResponse(200, invoice, 'Invoice fetched successfully'));
});

export const updateInvoiceStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  const invoice = await ContractorInvoice.findById(id);
  if (!invoice) throw new ApiError(404, 'Invoice not found');

  invoice.status = status;
  if (remarks) invoice.remarks = remarks;
  
  await invoice.save();

  if (status === 'Payment Processed') {
    let ledger = await ContractorBillingLedger.findOne({ workOrderId: invoice.workOrderId });
    if (!ledger) {
      ledger = new ContractorBillingLedger({
        workOrderId: invoice.workOrderId,
        contractorId: invoice.contractorId,
        items: []
      });
    }

    for (const item of invoice.lineItems) {
      if (!item.itemId) continue;
      
      let ledgerItem = ledger.items.find(i => i.itemId?.toString() === item.itemId.toString());
      if (!ledgerItem) {
        ledgerItem = {
          itemId: item.itemId,
          activity: item.activity,
          totalReceivedQty: 0,
          totalErectedQty: 0,
          supplyBilledPercentage: 0,
          erectionBilledPercentage: 0,
          lastBilledAt: new Date()
        };
        ledger.items.push(ledgerItem);
      }

      if (item.percentageApplied === 100) {
        ledgerItem.totalErectedQty += item.jmcDoneQty;
      } else {
        ledgerItem.totalErectedQty += item.erectedQty;
      }
      
      if (item.billingCategory === 'Supply') {
        ledgerItem.supplyBilledPercentage = Math.min(100, ledgerItem.supplyBilledPercentage + item.percentageApplied);
      } else if (item.billingCategory === 'Erection') {
        ledgerItem.erectionBilledPercentage = Math.min(100, ledgerItem.erectionBilledPercentage + item.percentageApplied);
      }
      ledgerItem.lastBilledAt = new Date();
    }
    await ledger.save();
  }

  res.status(200).json(new ApiResponse(200, invoice, 'Invoice status updated successfully'));
});

export const getBillingAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const stageBreakdown = await ContractorInvoice.aggregate([
    { $match: { status: { $ne: 'Rejected' } } },
    { $group: { _id: '$stage', totalAmount: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
  ]);

  const statusDistribution = await ContractorInvoice.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$grandTotal' } } }
  ]);

  const oldSubmittedInvoices = await ContractorInvoice.countDocuments({
    status: { $in: ['Pending PM Approval', 'Pending PD Approval', 'Pending HO Approval'] },
    updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
  });

  res.status(200).json(new ApiResponse(200, {
    stageBreakdown,
    statusDistribution,
    aging: {
      oldSubmittedCount: oldSubmittedInvoices
    }
  }, 'Billing analytics fetched successfully'));
});
