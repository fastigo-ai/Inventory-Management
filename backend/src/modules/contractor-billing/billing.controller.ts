import { Request, Response } from 'express';
import { ContractorInvoice } from './contractorInvoice.schema';
import { ContractorBillingLedger } from './contractorBillingLedger.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { JmcRegister } from '../jmc/jmc.schema';
import { Mhrov } from '../store/mhrov.schema';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import mongoose from 'mongoose';

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
    signedBillDocUrl,
    drawingNumber,
    supplyRaBillNo,
    billingCategory,
    linkedSupplyBillId,
    linkedErectionBillId
  } = req.body;
  
  const user = (req as any).user;

  const invoiceNumber = await generateInvoiceNumber();

  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  let percentage = 100;
  if (stage !== 'Amount' && stage !== 'Advance') {
    percentage = parseInt(stage.replace('%', '')) || 100;
  }

  let dbJmc: any = null;
  let dbMhrov: any = null;
  if (jmcId) {
    dbJmc = await JmcRegister.findById(jmcId).lean();
  }
  if (mhrovId) {
    dbMhrov = await Mhrov.findById(mhrovId).lean();
  }

  const processedItems = lineItems.map((item: any) => {
    let authoritativeQty = 0;

    // FIX: Override frontend quantity with DB verified quantity
    if (jmcId && dbJmc) {
      const dbItem = dbJmc.items.find((i: any) => i.itemId?.toString() === item.itemId?.toString());
      if (!dbItem) throw new ApiError(400, `Item ${item.itemId} not found in linked JMC`);
      authoritativeQty = Number(dbItem.approvedQty || dbItem.claimedQty || 0);
    } else if (mhrovId && dbMhrov) {
      const dbItem = dbMhrov.items?.find((i: any) => i.itemId?.toString() === item.itemId?.toString());
      if (!dbItem) throw new ApiError(400, `Item ${item.itemId} not found in linked MHROV`);
      authoritativeQty = Number(dbItem.mhrovDoneQty || 0);
    } else {
      authoritativeQty = percentage === 100 ? Number(item.jmcDoneQty || 0) : Number(item.erectedQty || 0);
    }

    let baseAmount = 0;
    
    if (stage === 'Amount' || stage === 'Advance') {
      baseAmount = Number(item.baseAmount || 0);
    } else if (percentage === 100) {
      baseAmount = authoritativeQty * Number(item.rate);
    } else {
      baseAmount = authoritativeQty * Number(item.rate) * (percentage / 100);
    }

    const gstAmount = authoritativeQty * Number(item.rate || 0) * (Number(item.gstRate || 0) / 100);
    const totalAmount = baseAmount + gstAmount;

    totalBaseAmount += baseAmount;
    totalGstAmount += gstAmount;

    return {
      itemId: item.itemId,
      contractorId: item.contractorId,
      activity: item.activity,
      description: item.description,
      billingCategory: item.billingCategory,
      jmcDoneQty: (jmcId && stage !== 'Amount' && stage !== 'Advance' && percentage === 100) ? authoritativeQty : Number(item.jmcDoneQty || 0),
      erectedQty: (jmcId && percentage !== 100) ? authoritativeQty : (mhrovId ? authoritativeQty : Number(item.erectedQty || 0)),
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
    billingCategory: billingCategory || 'Contractor Bill',
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
    drawingNumber,
    supplyRaBillNo,
    linkedSupplyBillId,
    linkedErectionBillId,
    status: 'Pending PM Approval',
    createdBy: user._id
  });

  res.status(201).json(new ApiResponse(201, invoice, 'Contractor Invoice created successfully'));
});

export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    stage, 
    supplyBasis, 
    lineItems,
    jmcDocUrl,
    signedBillDocUrl,
    drawingNumber,
    supplyRaBillNo,
    linkedSupplyBillId,
    linkedErectionBillId
  } = req.body;
  
  const user = (req as any).user;

  const invoice = await ContractorInvoice.findById(id);
  
  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  // Check if invoice is in a valid status to edit
  const editableStatuses = ['Draft', 'Pending PM Approval', 'Rejected'];
  if (!editableStatuses.includes(invoice.status)) {
    throw new ApiError(400, `Cannot edit invoice in ${invoice.status} status`);
  }

  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  let percentage = 100;
  if (stage !== 'Amount' && stage !== 'Advance') {
    percentage = parseInt(stage.replace('%', '')) || 100;
  } // '10%', '20%', '100%'

  let dbJmc: any = null;
  let dbMhrov: any = null;
  if (invoice.jmcId) {
    dbJmc = await JmcRegister.findById(invoice.jmcId).lean();
  }
  if (invoice.mhrovId) {
    dbMhrov = await Mhrov.findById(invoice.mhrovId).lean();
  }

  const processedItems = lineItems.map((item: any) => {
    let authoritativeQty = 0;

    // FIX: Override frontend quantity with DB verified quantity
    if (invoice.jmcId && dbJmc) {
      const dbItem = dbJmc.items.find((i: any) => i.itemId?.toString() === item.itemId?.toString());
      if (!dbItem) throw new ApiError(400, `Item ${item.itemId} not found in linked JMC`);
      authoritativeQty = Number(dbItem.approvedQty || dbItem.claimedQty || 0);
    } else if (invoice.mhrovId && dbMhrov) {
      const dbItem = dbMhrov.items?.find((i: any) => i.itemId?.toString() === item.itemId?.toString());
      if (!dbItem) throw new ApiError(400, `Item ${item.itemId} not found in linked MHROV`);
      authoritativeQty = Number(dbItem.mhrovDoneQty || 0);
    } else {
      authoritativeQty = percentage === 100 ? Number(item.jmcDoneQty || 0) : Number(item.erectedQty || 0);
    }

    let baseAmount = 0;
    
    if (stage === 'Amount' || stage === 'Advance') {
      baseAmount = Number(item.baseAmount || 0);
    } else if (percentage === 100) {
      baseAmount = authoritativeQty * Number(item.rate);
    } else {
      baseAmount = authoritativeQty * Number(item.rate) * (percentage / 100);
    }

    const gstAmount = authoritativeQty * Number(item.rate || 0) * (Number(item.gstRate || 0) / 100);
    const totalAmount = baseAmount + gstAmount;

    totalBaseAmount += baseAmount;
    totalGstAmount += gstAmount;

    return {
      itemId: item.itemId,
      contractorId: item.contractorId,
      activity: item.activity,
      description: item.description,
      billingCategory: item.billingCategory,
      jmcDoneQty: (invoice.jmcId && stage !== 'Amount' && stage !== 'Advance' && percentage === 100) ? authoritativeQty : Number(item.jmcDoneQty || 0),
      erectedQty: (invoice.jmcId && percentage !== 100) ? authoritativeQty : (invoice.mhrovId ? authoritativeQty : Number(item.erectedQty || 0)),
      rate: Number(item.rate),
      percentageApplied: percentage,
      baseAmount,
      gstRate: Number(item.gstRate || 0),
      gstAmount,
      totalAmount
    };
  });

  invoice.stage = stage;
  if (supplyBasis) invoice.supplyBasis = supplyBasis;
  invoice.lineItems = processedItems;
  invoice.totalBaseAmount = totalBaseAmount;
  invoice.totalGstAmount = totalGstAmount;
  invoice.grandTotal = totalBaseAmount + totalGstAmount;
  if (jmcDocUrl !== undefined) invoice.jmcDocUrl = jmcDocUrl;
  if (signedBillDocUrl !== undefined) invoice.signedBillDocUrl = signedBillDocUrl;
  if (drawingNumber !== undefined) invoice.drawingNumber = drawingNumber;
  if (supplyRaBillNo !== undefined) invoice.supplyRaBillNo = supplyRaBillNo;
  if (linkedSupplyBillId !== undefined) invoice.linkedSupplyBillId = linkedSupplyBillId;
  if (linkedErectionBillId !== undefined) invoice.linkedErectionBillId = linkedErectionBillId;
  
  // If it was rejected, editing it sends it back to Pending PM Approval
  if (invoice.status === 'Rejected' || invoice.status === 'Draft') {
    invoice.status = 'Pending PM Approval';
  }

  await invoice.save();

  res.status(200).json(new ApiResponse(200, invoice, 'Contractor Invoice updated successfully'));
});

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = user.contractorId;
  } else if (req.query.contractorId && req.query.contractorId !== 'All') {
    filter.contractorId = req.query.contractorId;
  }

  if (req.query.workOrderId && req.query.workOrderId !== 'All') {
    filter.workOrderId = req.query.workOrderId;
  }

  if (req.query.status && req.query.status !== 'All') {
    filter.status = req.query.status;
  }

  let invoices = await ContractorInvoice.find(filter)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber package circle')
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 });

  // Filter by package/circle (either from query or user assigned)
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const targetCircle = (req.query.circle && req.query.circle !== 'All') ? String(req.query.circle) : 
                       (user?.assignedCircle && user.assignedCircle !== 'All' ? user.assignedCircle : null);
                       
  const targetPackage = (req.query.package && req.query.package !== 'All') ? String(req.query.package) : 
                        (user?.assignedPackage && user.assignedPackage !== 'All' ? user.assignedPackage : null);

  const normalizeStr = (str: string) => str ? str.replace(/\s+/g, '').toLowerCase() : '';

  if (targetCircle || targetPackage) {
    invoices = invoices.filter((inv: any) => {
      let match = true;
      const wo = inv.workOrderId;
      if (!wo) return false; 

      if (targetCircle && targetCircle !== 'All') {
        if (normalizeStr(wo.circle) !== normalizeStr(targetCircle)) match = false;
      }
      if (targetPackage && targetPackage !== 'All') {
        if (normalizeStr(wo.package) !== normalizeStr(targetPackage)) match = false;
      }
      return match;
    });
  }

  res.status(200).json(new ApiResponse(200, invoices, 'Invoices fetched successfully'));
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await ContractorInvoice.findById(id)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber items')
    .populate('mhrovId', 'mhrovNumber')
    .populate('jmcId', 'jmcNumber')
    .populate('handoverCertificateId', 'certificateNumber');

  if (!invoice) throw new ApiError(404, 'Invoice not found');

  res.status(200).json(new ApiResponse(200, invoice, 'Invoice fetched successfully'));
});

export const updateInvoiceStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const invoice = await ContractorInvoice.findById(id).session(session);
    if (!invoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    if (status === 'Payment Processed' && invoice.status !== 'Payment Processed') {
      const workOrder = await ContractorWorkOrder.findById(invoice.workOrderId).session(session);
      if (!workOrder) throw new ApiError(400, 'Work Order not found for this invoice');

      let ledger = await ContractorBillingLedger.findOne({ workOrderId: invoice.workOrderId }).session(session);
      if (!ledger) {
        ledger = new ContractorBillingLedger({
          workOrderId: invoice.workOrderId,
          contractorId: invoice.contractorId,
          items: []
        });
      }

      for (const item of invoice.lineItems) {
        if (!item.itemId) continue;
        
        const woItem = workOrder.items.find((i: any) => i.itemId?.toString() === item.itemId.toString());
        if (!woItem) throw new ApiError(400, `Item ${item.itemId} not found in Work Order`);
        
        const contractValue = Number(woItem.amount || (Number(woItem.totalLoaQty) * Number(woItem.rate)) || 0);

        let ledgerItem = ledger.items.find(i => i.itemId?.toString() === item.itemId.toString());
        if (!ledgerItem) {
          ledgerItem = {
            itemId: item.itemId,
            activity: item.activity,
            totalReceivedQty: 0,
            totalErectedQty: 0,
            totalSupplyBilledAmount: 0,
            totalErectionBilledAmount: 0,
            lastBilledAt: new Date()
          };
          ledger.items.push(ledgerItem);
        }

        const newBaseAmount = Number(item.baseAmount || 0);
        
        // Use absolute amounts to avoid float % errors and validate limits
        if (item.billingCategory === 'Supply') {
          if (ledgerItem.totalSupplyBilledAmount + newBaseAmount > contractValue + 0.01) { // 0.01 margin for float errors
             throw new ApiError(400, `Billing limit exceeded for item ${item.description || item.itemId}. Contract Value: ${contractValue}, Already Billed: ${ledgerItem.totalSupplyBilledAmount}, New Bill: ${newBaseAmount}`);
          }
          ledgerItem.totalSupplyBilledAmount += newBaseAmount;
        } else if (item.billingCategory === 'Erection' || item.billingCategory === 'JMC Done') {
          if (ledgerItem.totalErectionBilledAmount + newBaseAmount > contractValue + 0.01) {
             throw new ApiError(400, `Billing limit exceeded for item ${item.description || item.itemId}. Contract Value: ${contractValue}, Already Billed: ${ledgerItem.totalErectionBilledAmount}, New Bill: ${newBaseAmount}`);
          }
          ledgerItem.totalErectionBilledAmount += newBaseAmount;
        }

        if (item.percentageApplied === 100) {
          ledgerItem.totalErectedQty += Number(item.jmcDoneQty || 0);
        } else {
          ledgerItem.totalErectedQty += Number(item.erectedQty || 0);
        }
        
        ledgerItem.lastBilledAt = new Date();
      }
      await ledger.save({ session });
    }

    invoice.status = status;
    if (remarks) invoice.remarks = remarks;
    
    await invoice.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json(new ApiResponse(200, invoice, 'Invoice status updated successfully'));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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
