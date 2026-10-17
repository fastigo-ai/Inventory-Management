import mongoose from 'mongoose';
import { ContractorInvoice } from './contractorInvoice.schema';
import { ContractorBillingLedger } from './contractorBillingLedger.schema';
import { ApiError } from '../../core/utils/ApiError';
import { JmcRegister } from '../jmc/jmc.schema';
import { Mhrov } from '../store/mhrov.schema';
import { ContractorWorkOrder } from '../contractors/contractorWorkOrder.schema';
import { ClientBill } from '../client-billing/clientBill.schema';

// Helper to generate Invoice Number atomically-ish (or closest to existing pattern)
const generateInvoiceNumber = async (billingCategory: string) => {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const typeCode = billingCategory === 'Erection Bill' ? 'ER' : 'CB';
  const prefix = `INV/${typeCode}/${currentYear}/`;
  
  const lastInvoice = await ContractorInvoice.findOne({ invoiceNumber: new RegExp(`^${prefix}`) })
    .sort({ invoiceNumber: -1 })
    .lean();
    
  let nextNumber = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const lastNumStr = lastInvoice.invoiceNumber.split('/').pop();
    if (lastNumStr && !isNaN(Number(lastNumStr))) {
      nextNumber = parseInt(lastNumStr, 10) + 1;
    }
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

export const createInvoiceService = async (data: any, user: any) => {
  const {
    contractorId,
    workOrderId,
    stage,
    mhrovId,
    jmcIds,
    handoverCertificateId,
    supplyBasis,
    lineItems,
    jmcDocUrl,
    signedBillDocUrl,
    drawingNumber,
    supplyRaBillNo,
    billingCategory,
    linkedSupplyBillId,
    linkedErectionBillId,
    legacyMetadata
  } = data;

  if (!workOrderId && !data.isLegacyBulkUpload) throw new ApiError(400, 'Work Order ID is required');

  // Enforce JMC link requirement for erection bills
  if (billingCategory === 'Erection Bill' && (!jmcIds || jmcIds.length === 0) && !data.isLegacyBulkUpload) {
    throw new ApiError(400, 'Erection bills must be linked to a JMC (only JMC and erection RA bill supported).');
  }

  const CIRCLE_PACKAGE_MAP: Record<string, string> = {
    'Rohru': 'Package 2(R/R)',
    'Rampur': 'Package 2(R/R)',
    'Solan': 'Package 1(S/N)',
    'Nahan': 'Package 1(S/N)',
  };

  // Ensure legacy metadata has proper circle and mapped package to prevent ghosting
  if (legacyMetadata) {
    if (legacyMetadata.circle) {
      const cleanCircle = legacyMetadata.circle.trim();
      const matchedCircleKey = Object.keys(CIRCLE_PACKAGE_MAP).find(c => c.toLowerCase() === cleanCircle.toLowerCase());
      if (matchedCircleKey) {
        legacyMetadata.circle = matchedCircleKey;
        if (!legacyMetadata.package) {
          legacyMetadata.package = CIRCLE_PACKAGE_MAP[matchedCircleKey];
        }
      }
    }
  }

  let invoiceNumber = '';
  if ((data.isLegacyBulkUpload || !workOrderId) && (legacyMetadata?.raBillNo || supplyRaBillNo)) {
    const typeCode = billingCategory === 'Erection Bill' ? 'ER' : 'CB';
    const raBill = (legacyMetadata?.raBillNo || supplyRaBillNo || '1').trim();
    const circleStr = legacyMetadata?.circle ? `-${legacyMetadata.circle.trim().toUpperCase().replace(/\s+/g, '_')}` : '';
    invoiceNumber = `INV/${typeCode}/${raBill}${circleStr}`;
  } else {
    invoiceNumber = await generateInvoiceNumber(billingCategory);
  }

  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  let percentage = 100;
  if (stage !== 'Amount' && stage !== 'Advance' && stage !== 'Adhoc') {
    percentage = parseInt(stage.replace('%', '')) || 100;
  }

  let dbJmcs: any[] = [];
  let dbMhrov: any = null;
  if (jmcIds && jmcIds.length > 0) {
    dbJmcs = await JmcRegister.find({ _id: { $in: jmcIds } }).lean();
  }
  if (mhrovId) {
    dbMhrov = await Mhrov.findById(mhrovId).lean();
  }

  const processedItems = lineItems.map((item: any) => {
    let authoritativeQty = 0;

    // Validate quantities against JMC/MHROV if linked
    if (jmcIds && jmcIds.length > 0 && dbJmcs.length > 0) {
      let found = false;
      dbJmcs.forEach(dbJmc => {
        const dbItem = dbJmc.items.find((i: any) => i.itemId?.toString() === item.itemId?.toString());
        if (dbItem) {
          found = true;
          authoritativeQty += Number(dbItem.approvedQty || dbItem.claimedQty || 0);
        }
      });
      if (!found) throw new ApiError(400, `Item ${item.itemId} not found in any linked JMC`);
    } else if (mhrovId && dbMhrov) {
      const dbItem = dbMhrov.items?.find((i: any) => i.itemId?.toString() === item.itemId?.toString());
      if (!dbItem) throw new ApiError(400, `Item ${item.itemId} not found in linked MHROV`);
      authoritativeQty = Number(dbItem.mhrovDoneQty || 0);
    } else {
      // Direct bill or bulk upload: take whichever positive quantity was provided
      authoritativeQty = Number(item.jmcDoneQty || item.erectedQty || item.qty || 0);
    }

    const itemRate = Number(item.rate || 0);

    // Full 100% work/material base value
    let fullBaseAmount = 0;
    if (stage === 'Amount' || stage === 'Advance' || stage === 'Adhoc') {
      fullBaseAmount = Number(item.baseAmount !== undefined && Number(item.baseAmount) > 0 ? item.baseAmount : (authoritativeQty * itemRate));
    } else if (authoritativeQty > 0 && itemRate > 0) {
      fullBaseAmount = authoritativeQty * itemRate;
    } else if (item.baseAmount !== undefined && Number(item.baseAmount) > 0) {
      // If baseAmount was directly provided (e.g. from Excel upload)
      fullBaseAmount = percentage > 0 && percentage < 100
        ? Number(item.baseAmount) / (percentage / 100)
        : Number(item.baseAmount);
    }

    // Payable base amount at stage percentage
    let baseAmount = 0;
    if (stage === 'Amount' || stage === 'Advance' || stage === 'Adhoc' || percentage === 100) {
      baseAmount = fullBaseAmount;
    } else {
      baseAmount = fullBaseAmount * (percentage / 100);
    }

    // Critical Rule: GST rate is strictly 18% for contractor and erection bills, calculated on 100% of Base Price
    const gstRate = 18;
    const gstAmount = Number((fullBaseAmount * (gstRate / 100)).toFixed(2));
    const totalAmount = Number((baseAmount + gstAmount).toFixed(2));

    totalBaseAmount += baseAmount;
    totalGstAmount += gstAmount;

    const loaSerialNo = String(item.loaSerialNo || item.loaSrNo || item.legacyData?.loaSerialNo || '').trim();
    const tempCode = String(item.tempCode || item.tc || '').trim();

    return {
      itemId: item.itemId,
      contractorId: item.contractorId,
      activity: item.activity,
      description: item.description,
      tempCode,
      loaSrNo: loaSerialNo,
      loaSerialNo,
      billingCategory: item.billingCategory,
      jmcDoneQty: Number(item.jmcDoneQty || authoritativeQty || 0),
      erectedQty: Number(item.erectedQty || authoritativeQty || 0),
      rate: itemRate,
      percentageApplied: percentage,
      baseAmount,
      gstRate,
      gstAmount,
      totalAmount,
      legacyData: {
        ...(item.legacyData || {}),
        loaSerialNo,
        unit: item.unit || item.legacyData?.unit || ''
      }
    };
  });

  // Check if invoice already exists to handle re-uploads and multi-contractor collisions
  const existingInvoice = await ContractorInvoice.findOne({ invoiceNumber });
  if (existingInvoice) {
    const isSameContractor = String(existingInvoice.contractorId) === String(contractorId);
    const isEditable = ['Draft', 'Pending PM Approval', 'Rejected'].includes(existingInvoice.status);
    const shouldUpdate = data.updateExisting === true || (data.updateExisting === undefined && isSameContractor && isEditable);

    if (shouldUpdate && isSameContractor && isEditable) {
      // Re-upload or explicit update for same contractor: update existing invoice seamlessly
      existingInvoice.lineItems = processedItems;
      existingInvoice.totalBaseAmount = totalBaseAmount;
      existingInvoice.totalGstAmount = totalGstAmount;
      existingInvoice.grandTotal = totalBaseAmount + totalGstAmount;
      existingInvoice.stage = stage;
      existingInvoice.drawingNumber = drawingNumber !== undefined ? drawingNumber : existingInvoice.drawingNumber;
      existingInvoice.supplyRaBillNo = supplyRaBillNo || existingInvoice.supplyRaBillNo;
      existingInvoice.billingCategory = billingCategory || existingInvoice.billingCategory;
      existingInvoice.legacyMetadata = legacyMetadata || existingInvoice.legacyMetadata;
      existingInvoice.date = new Date();
      await existingInvoice.save();
      return existingInvoice;
    } else {
      // Different contractor, already finalized, or user chose to create as a separate bill:
      let suffix = 2;
      while (await ContractorInvoice.findOne({ invoiceNumber: `${invoiceNumber}-${suffix}` })) {
        suffix++;
      }
      invoiceNumber = `${invoiceNumber}-${suffix}`;
    }
  }

  const invoice = await ContractorInvoice.create({
    invoiceNumber,
    billingCategory: billingCategory || 'Contractor Bill',
    contractorId,
    workOrderId,
    stage,
    mhrovId,
    jmcIds,
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
    createdBy: user._id,
    legacyMetadata
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
  if (invoice.billingCategory === 'Erection Bill' && (!invoice.jmcIds || invoice.jmcIds.length === 0) && !data.isLegacyBulkUpload) {
    throw new ApiError(400, 'Erection bills must be linked to a JMC.');
  }

  let totalBaseAmount = 0;
  let totalGstAmount = 0;

  let percentage = 100;
  if (stage !== 'Amount' && stage !== 'Advance' && stage !== 'Adhoc') {
    percentage = parseInt(stage.replace('%', '')) || 100;
  }

  let dbJmcs: any[] = [];
  let dbMhrov: any = null;
  if (invoice.jmcIds && invoice.jmcIds.length > 0) {
    dbJmcs = await JmcRegister.find({ _id: { $in: invoice.jmcIds } }).lean();
  }
  if (invoice.mhrovId) {
    dbMhrov = await Mhrov.findById(invoice.mhrovId).lean();
  }

  const processedItems = lineItems.map((item: any) => {
    let authoritativeQty = 0;

    if (invoice.jmcIds && invoice.jmcIds.length > 0 && dbJmcs.length > 0) {
      let found = false;
      dbJmcs.forEach(dbJmc => {
        const dbItem = dbJmc.items.find((i: any) => i.itemId?.toString() === item.itemId?.toString());
        if (dbItem) {
          found = true;
          authoritativeQty += Number(dbItem.approvedQty || dbItem.claimedQty || 0);
        }
      });
      if (!found) throw new ApiError(400, `Item ${item.itemId} not found in any linked JMC`);
    } else if (invoice.mhrovId && dbMhrov) {
      const dbItem = dbMhrov.items?.find((i: any) => i.itemId?.toString() === item.itemId?.toString());
      if (!dbItem) throw new ApiError(400, `Item ${item.itemId} not found in linked MHROV`);
      authoritativeQty = Number(dbItem.mhrovDoneQty || 0);
    } else {
      authoritativeQty = Number(item.jmcDoneQty || item.erectedQty || item.qty || 0);
    }

    const itemRate = Number(item.rate || 0);

    // Full 100% work/material base value
    let fullBaseAmount = 0;
    if (stage === 'Amount' || stage === 'Advance' || stage === 'Adhoc') {
      fullBaseAmount = Number(item.baseAmount !== undefined && Number(item.baseAmount) > 0 ? item.baseAmount : (authoritativeQty * itemRate));
    } else if (authoritativeQty > 0 && itemRate > 0) {
      fullBaseAmount = authoritativeQty * itemRate;
    } else if (item.baseAmount !== undefined && Number(item.baseAmount) > 0) {
      // If baseAmount was directly provided
      fullBaseAmount = percentage > 0 && percentage < 100
        ? Number(item.baseAmount) / (percentage / 100)
        : Number(item.baseAmount);
    }

    // Payable base amount at stage percentage
    let baseAmount = 0;
    if (stage === 'Amount' || stage === 'Advance' || stage === 'Adhoc' || percentage === 100) {
      baseAmount = fullBaseAmount;
    } else {
      baseAmount = fullBaseAmount * (percentage / 100);
    }

    // Critical Rule: GST rate is strictly 18% for contractor and erection bills, calculated on 100% of Base Price
    const gstRate = 18;
    const gstAmount = Number((fullBaseAmount * (gstRate / 100)).toFixed(2));
    const totalAmount = Number((baseAmount + gstAmount).toFixed(2));

    totalBaseAmount += baseAmount;
    totalGstAmount += gstAmount;

    const loaSerialNo = String(item.loaSerialNo || item.loaSrNo || item.legacyData?.loaSerialNo || '').trim();
    const tempCode = String(item.tempCode || item.tc || '').trim();

    return {
      itemId: item.itemId,
      contractorId: item.contractorId,
      activity: item.activity,
      description: item.description,
      tempCode,
      loaSrNo: loaSerialNo,
      loaSerialNo,
      billingCategory: item.billingCategory,
      jmcDoneQty: (invoice.jmcIds && invoice.jmcIds.length > 0 && stage !== 'Amount' && stage !== 'Advance' && stage !== 'Adhoc' && percentage === 100) ? authoritativeQty : Number(item.jmcDoneQty || (item.billingCategory === 'JMC Done' ? authoritativeQty : 0)),
      erectedQty: (invoice.jmcIds && invoice.jmcIds.length > 0 && percentage !== 100) ? authoritativeQty : (invoice.mhrovId ? authoritativeQty : Number(item.erectedQty || (item.billingCategory === 'Erection' ? authoritativeQty : 0))),
      rate: itemRate,
      percentageApplied: percentage,
      baseAmount,
      gstRate,
      gstAmount,
      totalAmount,
      legacyData: {
        ...(item.legacyData || {}),
        loaSerialNo,
        unit: item.unit || item.legacyData?.unit || ''
      }
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
    const SUB_STORE_MAP: Record<string, string[]> = {
      'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
      'Nahan': ['Nahan'],
      'Rohru': ['Rohru'],
      'Rampur': ['Rampur'],
    };
    const allowedCircles = SUB_STORE_MAP[targetCircle] || [targetCircle];
    const regexCircles = allowedCircles.map(c => new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
    matchFilter.circle = { $in: regexCircles };
  }
  if (targetPackage) {
    const packageEscaped = targetPackage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[- ]/g, '[\\s\\-]*');
    matchFilter.package = new RegExp(`^${packageEscaped}$`, 'i');
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

  // Filter out any where populated workOrderId is null because it didn't match the circle/package criteria,
  // For legacy invoices (which have no workOrderId), filter them based on their legacyMetadata.
  if (Object.keys(matchFilter).length > 0) {
    const LOCAL_SUB_STORE_MAP: Record<string, string[]> = {
      'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
      'Nahan': ['Nahan'],
      'Rohru': ['Rohru'],
      'Rampur': ['Rampur'],
    };
    const allowedCircles = targetCircle ? (LOCAL_SUB_STORE_MAP[targetCircle] || [targetCircle]).map(c => c.toLowerCase()) : [];
    
    return invoices.filter((inv: any) => {
      if (inv.workOrderId != null) return true;
      
      if (inv.legacyMetadata) {
        const invCircle = String(inv.legacyMetadata.circle || '').toLowerCase();
        const invPkg = String(inv.legacyMetadata.package || '').toLowerCase();

        if (targetCircle) {
          if (!allowedCircles.includes(invCircle)) {
            return false;
          }
        }
        if (targetPackage) {
          const cleanTarget = targetPackage.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanInv = invPkg.replace(/[^a-z0-9]/g, '');
          const circleToPkg = (invCircle.includes('rohru') || invCircle.includes('rampur')) ? 'package2' : (invCircle.includes('solan') || invCircle.includes('nahan') ? 'package1' : '');

          const matchesPkg = cleanInv.includes(cleanTarget) || cleanTarget.includes(cleanInv) || (circleToPkg && cleanTarget.includes(circleToPkg));
          if (!matchesPkg) {
            return false;
          }
        }
        return true;
      }

      return false;
    });
  }

  return invoices;
};

export const getInvoiceByIdService = async (id: string) => {
  const invoice = await ContractorInvoice.findById(id)
    .populate('contractorId', 'name vendorName dynamicData assignedLocations location')
    .populate('workOrderId', 'workOrderNumber items circle package')
    .populate('mhrovId', 'mhrovNumber')
    .populate('jmcIds', 'jmcNumber')
    .populate('handoverCertificateId', 'certificateNumber')
    .populate('lineItems.itemId', 'name itemName dynamicData activity rate boqRate');

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

export const getBillingAnalyticsService = async (query: any, user: any) => {
  // Fetch all invoices using the same filtering logic as the list endpoint
  const allInvoices = await getInvoicesService(query, user);
  
  const stageBreakdownMap: Record<string, { totalAmount: number, count: number }> = {};
  const statusDistributionMap: Record<string, { totalAmount: number, count: number }> = {};
  let contractorBillAmount = 0;
  let contractorBillCount = 0;
  let erectionBillAmount = 0;
  let erectionBillCount = 0;
  let totalContractorBilled = 0;
  let totalContractorCount = 0;
  let oldSubmittedCount = 0;
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  allInvoices.forEach((inv: any) => {
    // 1. Status Distribution
    if (!statusDistributionMap[inv.status]) {
      statusDistributionMap[inv.status] = { totalAmount: 0, count: 0 };
    }
    statusDistributionMap[inv.status].count += 1;
    statusDistributionMap[inv.status].totalAmount += (inv.grandTotal || 0);
    
    // 2. Stage Breakdown & Category Totals (Exclude Rejected)
    if (inv.status !== 'Rejected') {
      const grandTotal = Number(inv.grandTotal || 0);
      totalContractorBilled += grandTotal;
      totalContractorCount += 1;

      const isContractorBill = inv.billingCategory === 'Contractor Bill' || (!inv.billingCategory && String(inv.invoiceNumber || '').includes('/CB/'));
      const isErectionBill = inv.billingCategory === 'Erection Bill' || (!inv.billingCategory && String(inv.invoiceNumber || '').includes('/ER/'));

      if (isContractorBill) {
        contractorBillAmount += grandTotal;
        contractorBillCount += 1;
      } else if (isErectionBill) {
        erectionBillAmount += grandTotal;
        erectionBillCount += 1;
      } else {
        if (String(inv.invoiceNumber || '').includes('/CB/')) {
          contractorBillAmount += grandTotal;
          contractorBillCount += 1;
        } else {
          erectionBillAmount += grandTotal;
          erectionBillCount += 1;
        }
      }

      if (!stageBreakdownMap[inv.stage]) {
        stageBreakdownMap[inv.stage] = { totalAmount: 0, count: 0 };
      }
      stageBreakdownMap[inv.stage].count += 1;
      stageBreakdownMap[inv.stage].totalAmount += grandTotal;
    }
    
    // 3. Aging
    if (['Pending PM Approval', 'Pending PD Approval', 'Pending HO Approval'].includes(inv.status)) {
      if (new Date(inv.updatedAt) < sevenDaysAgo) {
        oldSubmittedCount += 1;
      }
    }
  });
  
  const stageBreakdown = Object.keys(stageBreakdownMap).map(stage => ({
    _id: stage,
    totalAmount: stageBreakdownMap[stage].totalAmount,
    count: stageBreakdownMap[stage].count
  }));
  
  const statusDistribution = Object.keys(statusDistributionMap).map(status => ({
    _id: status,
    totalAmount: statusDistributionMap[status].totalAmount,
    count: statusDistributionMap[status].count
  }));

  return {
    contractorBillAmount,
    contractorBillCount,
    erectionBillAmount,
    erectionBillCount,
    totalContractorBilled,
    totalContractorCount,
    stageBreakdown,
    statusDistribution,
    aging: {
      oldSubmittedCount
    }
  };
};

export const deleteInvoiceService = async (id: string, user: any) => {
  const invoice = await ContractorInvoice.findById(id);
  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  // Allow delete if pending or if it is a legacy bulk upload (they have no work order)
  const isPending = invoice.status === 'Pending PM Approval';
  const isLegacy = !!invoice.legacyMetadata;
  const isAdmin = user.role?.name === 'Admin';
  
  if (!isPending && !isLegacy && !isAdmin) {
    throw new ApiError(403, 'Only pending or legacy invoices can be deleted, unless you are an Admin');
  }

  await ContractorInvoice.findByIdAndDelete(id);
  return { success: true };
};
