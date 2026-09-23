import mongoose from 'mongoose';
import { ContractorInvoice } from './contractorInvoice.schema';
import { ContractorBillingLedger } from './contractorBillingLedger.schema';
import { ApiError } from '../../core/utils/ApiError';
import { JmcRegister } from '../jmc/jmc.schema';
import { Mhrov } from '../store/mhrov.schema';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import { ClientBill } from '../client-billing/clientBill.schema';

// Helper to generate Invoice Number atomically-ish (or closest to existing pattern)
const generateInvoiceNumber = async () => {
  const count = await ContractorInvoice.countDocuments();
  return `INV/CB/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
};

export const createInvoiceService = async (data: any, user: any) => {
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
  } = data;

  if (!workOrderId) throw new ApiError(400, 'Work Order ID is required');

  // Enforce JMC link requirement for erection bills
  if (billingCategory === 'Erection Bill' && !jmcId) {
    throw new ApiError(400, 'Erection bills must be linked to a JMC (only JMC and erection RA bill supported).');
  }

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

    // Validate quantities against JMC/MHROV if linked
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

    const itemRate = Number(item.rate || 0);

    let baseAmount = 0;

    if (stage === 'Amount' || stage === 'Advance') {
      baseAmount = Number(item.baseAmount || 0);
    } else if (percentage === 100) {
      baseAmount = authoritativeQty * itemRate;
    } else {
      baseAmount = authoritativeQty * itemRate * (percentage / 100);
    }

    const gstAmount = authoritativeQty * itemRate * (Number(item.gstRate || 0) / 100);
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
      rate: itemRate,
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

  return invoice;
};

export const updateInvoiceService = async (id: string, data: any, user: any) => {
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
  } = data;

  const invoice = await ContractorInvoice.findById(id);

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  const editableStatuses = ['Draft', 'Pending PM Approval', 'Rejected'];
  if (!editableStatuses.includes(invoice.status)) {
    throw new ApiError(400, `Cannot edit invoice in ${invoice.status} status`);
  }

  // Same validation pattern as create
  if (invoice.billingCategory === 'Erection Bill' && !invoice.jmcId) {
    throw new ApiError(400, 'Erection bills must be linked to a JMC.');
  }

  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  let percentage = 100;
  if (stage !== 'Amount' && stage !== 'Advance') {
    percentage = parseInt(stage.replace('%', '')) || 100;
  }

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

    const itemRate = Number(item.rate || 0);

    let baseAmount = 0;

    if (stage === 'Amount' || stage === 'Advance') {
      baseAmount = Number(item.baseAmount || 0);
    } else if (percentage === 100) {
      baseAmount = authoritativeQty * itemRate;
    } else {
      baseAmount = authoritativeQty * itemRate * (percentage / 100);
    }

    const gstAmount = authoritativeQty * itemRate * (Number(item.gstRate || 0) / 100);
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
      rate: itemRate,
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
  
  if (invoice.status === 'Rejected' || invoice.status === 'Draft') {
    invoice.status = 'Pending PM Approval';
  }

  await invoice.save();
  return invoice;
};

export const getInvoicesService = async (query: any, user: any) => {
  const filter: any = {};

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = user.contractorId;
  } else if (query.contractorId && query.contractorId !== 'All') {
    filter.contractorId = query.contractorId;
  }

  if (query.workOrderId && query.workOrderId !== 'All') {
    filter.workOrderId = query.workOrderId;
  }

  if (query.status && query.status !== 'All') {
    filter.status = query.status;
  }

  const targetCircle = (query.circle && query.circle !== 'All') ? String(query.circle) : 
                       (user?.assignedCircle && user.assignedCircle !== 'All' ? user.assignedCircle : null);
                       
  const targetPackage = (query.package && query.package !== 'All') ? String(query.package) : 
                        (user?.assignedPackage && user.assignedPackage !== 'All' ? user.assignedPackage : null);

  // Performance Fix: Filter by package/circle directly using populated match
  const matchFilter: any = {};
  if (targetCircle) {
    // Regex allows matching even with slightly different spacing or case, but an exact match is better if standardized
    matchFilter.circle = new RegExp(`^${targetCircle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  if (targetPackage) {
    matchFilter.package = new RegExp(`^${targetPackage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  const invoices = await ContractorInvoice.find(filter)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate({
      path: 'workOrderId',
      select: 'workOrderNumber package circle',
      match: Object.keys(matchFilter).length > 0 ? matchFilter : undefined
    })
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 });

  // Filter out any where populated workOrderId is null because it didn't match the circle/package criteria
  if (Object.keys(matchFilter).length > 0) {
    return invoices.filter((inv: any) => inv.workOrderId != null);
  }

  return invoices;
};

export const getInvoiceByIdService = async (id: string) => {
  const invoice = await ContractorInvoice.findById(id)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber items')
    .populate('mhrovId', 'mhrovNumber')
    .populate('jmcId', 'jmcNumber')
    .populate('handoverCertificateId', 'certificateNumber');

  if (!invoice) throw new ApiError(404, 'Invoice not found');
  return invoice;
};

export const updateInvoiceStatusService = async (id: string, status: string, remarks: string, user: any) => {
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
        
        // Fix: Use correct properties from IContractorWorkOrderItem schema
        const contractValue = Number(woItem.amount || (Number(woItem.woQty) * Number(woItem.contractorErectionRate)) || 0);

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
        
        if (item.billingCategory === 'Supply') {
          if (ledgerItem.totalSupplyBilledAmount + newBaseAmount > contractValue + 0.01) {
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

    if (status === 'Payment Processed' && invoice.status !== 'Payment Processed') {
      if (invoice.billingCategory === 'Erection Bill' && invoice.stage === '90%' && invoice.linkedSupplyBillId) {
        const supplySource = await ClientBill.findById(invoice.linkedSupplyBillId).session(session);
        if (supplySource) {
          const existingDraft = await ClientBill.findOne({ parentBillId: invoice._id, stage: '30%' }).session(session);
          if (!existingDraft) {
            const thirtyPctItems = invoice.lineItems.map((item: any) => {
              const srcItem = supplySource.items.find((si: any) => si.itemId?.toString() === item.itemId?.toString());
              
              const base = srcItem ? (Number(srcItem.boqRate) || 0) : (Number(item.rate) || 0);
              const qty = Number(item.jmcDoneQty) || Number(item.erectedQty) || 0;
              const billedBase = Number((qty * base * 0.3).toFixed(2));
              
              return {
                loaSrNo: srcItem ? srcItem.loaSrNo : (item.loaSrNo || ''),
                itemId: item.itemId,
                tempCode: srcItem ? srcItem.tempCode : '',
                refNumber: invoice.invoiceNumber,
                itemName: item.description || (srcItem ? srcItem.itemName : ''),
                diNo: srcItem ? srcItem.diNo : '',
                diDate: srcItem ? srcItem.diDate : undefined,
                diQty: srcItem ? srcItem.diQty : 0,
                sourceDoneQty: qty,
                raBillQty: qty,
                boqRate: base,
                totalAmount: billedBase,
                gstAmount: 0
              };
            });
            
            const supplyDraft = new ClientBill({
              raBillNo: `${supplySource.raBillNo}-S30-AUTO-${invoice.invoiceNumber.replace(/[^A-Za-z0-9]/g, '')}`,
              raBillDate: new Date(),
              billType: 'Supply',
              stage: '30%',
              referenceType: supplySource.referenceType,
              referenceIds: supplySource.referenceIds,
              items: thirtyPctItems,
              circle: supplySource.circle,
              package: supplySource.package,
              createdBy: user._id,
              status: 'Draft',
              autoCreated: true,
              parentBillId: invoice._id,
              linkedSupplyBillId: supplySource._id
            });
            
            await supplyDraft.save({ session });
          }
        }
      }
    }

    invoice.status = status as any;
    if (remarks) invoice.remarks = remarks;
    
    await invoice.save({ session });
    await session.commitTransaction();
    session.endSession();

    return invoice;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getBillingAnalyticsService = async () => {
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

  return {
    stageBreakdown,
    statusDistribution,
    aging: {
      oldSubmittedCount: oldSubmittedInvoices
    }
  };
};
