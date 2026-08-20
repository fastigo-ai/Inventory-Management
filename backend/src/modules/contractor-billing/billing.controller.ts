import { Request, Response } from 'express';
import { ContractorInvoice } from './contractorInvoice.schema';
import { ContractorBillingLedger } from './contractorBillingLedger.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { Mhrov } from '../store/mhrov.schema';
import { JmcRegister } from '../jmc/jmc.schema';
import { HandoverCertificate } from './handoverCertificate.schema';

// Helper to generate Invoice Number
const generateInvoiceNumber = async (stage: string) => {
  const count = await ContractorInvoice.countDocuments();
  const prefix = stage.includes('Stage 1') ? 'S1' : stage.includes('Stage 2') ? 'S2' : 'S3';
  return `INV/${prefix}/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
};

export const createStage1Invoice = asyncHandler(async (req: Request, res: Response) => {
  const { mhrovId, lineItems } = req.body;
  const user = (req as any).user;

  const mhrov = await Mhrov.findById(mhrovId);
  if (!mhrov) throw new ApiError(404, 'MHROV not found');

  const invoiceNumber = await generateInvoiceNumber('Stage 1 (Supply Initial)');

  // Calculate totals
  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  const processedItems = lineItems.map((item: any) => {
    // Stage 1 bills 60% of base amount, GST is 0% treated as proforma advance
    const baseAmount = Number(item.quantity) * Number(item.rate) * 0.60;
    const gstAmount = 0; // GST deferred to Stage 2
    const totalAmount = baseAmount + gstAmount;

    totalBaseAmount += baseAmount;
    totalGstAmount += gstAmount;

    return {
      itemId: item.itemId,
      activity: item.activity,
      description: item.description,
      billingCategory: 'Supply',
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      percentageApplied: 60,
      baseAmount,
      gstRate: 0,
      gstAmount,
      totalAmount
    };
  });

  const invoice = await ContractorInvoice.create({
    invoiceNumber,
    contractorId: req.body.contractorId,
    workOrderId: req.body.workOrderId,
    stage: 'Stage 1 (Supply Initial)',
    mhrovId,
    lineItems: processedItems,
    totalBaseAmount,
    totalGstAmount,
    grandTotal: totalBaseAmount + totalGstAmount,
    createdBy: user._id
  });

  res.status(201).json(new ApiResponse(201, invoice, 'Stage 1 Invoice created successfully'));
});

export const createStage2Invoice = asyncHandler(async (req: Request, res: Response) => {
  const { jmcId, supplyBasis, lineItems } = req.body;
  const user = (req as any).user;

  const jmc = await JmcRegister.findById(jmcId);
  if (!jmc) throw new ApiError(404, 'JMC Register entry not found');

  const invoiceNumber = await generateInvoiceNumber('Stage 2 (Erection & Supply Balance)');

  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  const processedItems = lineItems.map((item: any) => {
    let baseAmount = 0;
    let gstAmount = 0;

    if (item.billingCategory === 'Erection') {
      // 90% Erection Billing
      baseAmount = Number(item.quantity) * Number(item.rate) * 0.90;
      gstAmount = baseAmount * (Number(item.gstRate || 0) / 100);
    } else if (item.billingCategory === 'Supply') {
      // 30% Supply Billing + 100% of GST on the 90% (60% + 30%)
      const baseFor30Percent = Number(item.quantity) * Number(item.rate) * 0.30;
      const baseForGst = Number(item.quantity) * Number(item.rate) * 0.90; 
      baseAmount = baseFor30Percent;
      gstAmount = baseForGst * (Number(item.gstRate || 0) / 100);
    }

    const totalAmount = baseAmount + gstAmount;
    totalBaseAmount += baseAmount;
    totalGstAmount += gstAmount;

    return {
      itemId: item.itemId,
      activity: item.activity,
      description: item.description,
      billingCategory: item.billingCategory,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      percentageApplied: item.billingCategory === 'Erection' ? 90 : 30,
      baseAmount,
      gstRate: Number(item.gstRate || 0),
      gstAmount,
      totalAmount
    };
  });

  const invoice = await ContractorInvoice.create({
    invoiceNumber,
    contractorId: req.body.contractorId,
    workOrderId: req.body.workOrderId,
    stage: 'Stage 2 (Erection & Supply Balance)',
    jmcId,
    supplyBasis, // 'MHROV Total' or 'JMC Erected'
    lineItems: processedItems,
    totalBaseAmount,
    totalGstAmount,
    grandTotal: totalBaseAmount + totalGstAmount,
    createdBy: user._id
  });

  res.status(201).json(new ApiResponse(201, invoice, 'Stage 2 Invoice created successfully'));
});

export const createStage3Invoice = asyncHandler(async (req: Request, res: Response) => {
  const { handoverCertificateId, lineItems } = req.body;
  const user = (req as any).user;

  const handover = await HandoverCertificate.findById(handoverCertificateId);
  if (!handover) throw new ApiError(404, 'Handover Certificate not found');

  const invoiceNumber = await generateInvoiceNumber('Stage 3 (Final/Retention)');

  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  const processedItems = lineItems.map((item: any) => {
    // Stage 3 bills the final 10% of base amount, and any applicable GST (or 10% of GST)
    const baseAmount = Number(item.quantity) * Number(item.rate) * 0.10;
    // Assuming 100% of GST was billed by Stage 2, Stage 3 has 0 GST, unless they want 10% GST
    // We'll bill 10% GST on this amount for standard accounting matching
    const gstAmount = baseAmount * (Number(item.gstRate || 0) / 100);
    const totalAmount = baseAmount + gstAmount;

    totalBaseAmount += baseAmount;
    totalGstAmount += gstAmount;

    return {
      itemId: item.itemId,
      activity: item.activity,
      description: item.description,
      billingCategory: item.billingCategory, // 'Supply' or 'Erection'
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      percentageApplied: 10,
      baseAmount,
      gstRate: Number(item.gstRate || 0),
      gstAmount,
      totalAmount
    };
  });

  const invoice = await ContractorInvoice.create({
    invoiceNumber,
    contractorId: req.body.contractorId,
    workOrderId: req.body.workOrderId,
    stage: 'Stage 3 (Final/Retention)',
    handoverCertificateId,
    lineItems: processedItems,
    totalBaseAmount,
    totalGstAmount,
    grandTotal: totalBaseAmount + totalGstAmount,
    createdBy: user._id
  });

  res.status(201).json(new ApiResponse(201, invoice, 'Stage 3 Invoice created successfully'));
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
    .sort({ createdAt: 1 });

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

  // If approved, update ledger
  if (status === 'Approved') {
    let ledger = await ContractorBillingLedger.findOne({ workOrderId: invoice.workOrderId });
    if (!ledger) {
      ledger = new ContractorBillingLedger({
        workOrderId: invoice.workOrderId,
        contractorId: invoice.contractorId,
        items: []
      });
    }

    // Logic to update ledger items based on invoice stage
    for (const item of invoice.lineItems) {
      if (!item.itemId) continue;
      
      let ledgerItem = ledger.items.find(i => i.itemId?.toString() === item.itemId.toString());
      if (!ledgerItem) {
        ledgerItem = {
          itemId: item.itemId,
          activity: item.activity,
          totalReceivedQty: invoice.stage.includes('Stage 1') ? item.quantity : 0,
          totalErectedQty: invoice.stage.includes('Stage 2') && item.billingCategory === 'Erection' ? item.quantity : 0,
          supplyBilledPercentage: 0,
          erectionBilledPercentage: 0,
          lastBilledAt: new Date()
        };
        ledger.items.push(ledgerItem);
      } else {
        if (invoice.stage.includes('Stage 1')) {
          ledgerItem.totalReceivedQty = Math.max(ledgerItem.totalReceivedQty, item.quantity);
        }
        if (invoice.stage.includes('Stage 2') && item.billingCategory === 'Erection') {
          ledgerItem.totalErectedQty = Math.max(ledgerItem.totalErectedQty, item.quantity);
        }
      }

      if (item.billingCategory === 'Supply') {
        ledgerItem.supplyBilledPercentage += item.percentageApplied;
      } else if (item.billingCategory === 'Erection') {
        ledgerItem.erectionBilledPercentage += item.percentageApplied;
      }
      ledgerItem.lastBilledAt = new Date();
    }
    await ledger.save();
  }

  res.status(200).json(new ApiResponse(200, invoice, 'Invoice status updated successfully'));
});

export const getBillingAnalytics = asyncHandler(async (req: Request, res: Response) => {
  // 1. Billing Stage Breakdown
  const stageBreakdown = await ContractorInvoice.aggregate([
    { $match: { status: { $ne: 'Rejected' } } },
    { $group: { _id: '$stage', totalAmount: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
  ]);

  // 2. Invoice Status Distribution
  const statusDistribution = await ContractorInvoice.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$grandTotal' } } }
  ]);

  // 3. Aging analysis
  const oldSubmittedInvoices = await ContractorInvoice.countDocuments({
    status: 'Submitted',
    updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // older than 7 days
  });

  res.status(200).json(new ApiResponse(200, {
    stageBreakdown,
    statusDistribution,
    aging: {
      oldSubmittedCount: oldSubmittedInvoices
    }
  }, 'Billing analytics fetched successfully'));
});
