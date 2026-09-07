import { Request, Response } from 'express';
import { ClientBill } from './clientBill.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { v2 as cloudinary } from 'cloudinary';
import { ContractorInvoice } from '../contractor-billing/contractorInvoice.schema';
import { validateClientLedgerLimits, updateClientLedgerOnApproval } from './clientBillingLedger.utils';
import { ClientBillingLedger } from './clientBillingLedger.schema';

const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Build items array for an auto-created Supply bill from an approved
// Supply 60% bill, at the given percentage with 0% GST
// ─────────────────────────────────────────────────────────────────────────────
const buildAutoSupplyItems = (sourceItems: any[], percentage: number) => {
  return sourceItems.map((item: any) => {
    const base = Number(item.boqRate) || 0;
    const qty = Number(item.raBillQty) || 0;
    const fullBase = qty * base;
    const billedBase = Number((fullBase * (percentage / 100)).toFixed(2));
    return {
      loaSrNo: item.loaSrNo,
      itemId: item.itemId,
      tempCode: item.tempCode,
      refNumber: item.refNumber,
      itemName: item.itemName,
      diNo: item.diNo,
      diDate: item.diDate,
      diQty: item.diQty,
      sourceDoneQty: item.sourceDoneQty,
      raBillQty: item.raBillQty,
      boqRate: base,
      totalAmount: billedBase,
      gstAmount: 0  // 0% GST for 30% and 10% supply stages
    };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Parse uploaded files and return URLs
// ─────────────────────────────────────────────────────────────────────────────
const parseUploadedFiles = async (files: Express.Multer.File[]) => {
  let invoiceDocUrl = '';
  let diDocUrl = '';
  let mhrovDocUrl = '';
  const additionalDocsUrls: any[] = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, 'client-bills');
      if (file.fieldname === 'invoiceDoc') invoiceDocUrl = result.secure_url;
      else if (file.fieldname === 'diDoc') diDocUrl = result.secure_url;
      else if (file.fieldname === 'mhrovDoc') mhrovDocUrl = result.secure_url;
      else if (file.fieldname === 'additionalDocs') additionalDocsUrls.push({ name: file.originalname, url: result.secure_url });
    }
  }
  return { invoiceDocUrl, diDocUrl, mhrovDocUrl, additionalDocsUrls };
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CLIENT BILL
// ─────────────────────────────────────────────────────────────────────────────
export const createClientBill = asyncHandler(async (req: any, res: Response) => {
  const { raBillNo, raBillDate, billType, stage, referenceType, referenceIds, items, status, linkedSupplyBillId } = req.body;

  if (req.user?.role?.name !== 'Super Admin' && (!req.user?.assignedCircle || !req.user?.assignedPackage)) {
    return res.status(400).json(new ApiResponse(400, null, 'User missing assigned circle/package'));
  }

  let parsedItems = [];
  try { parsedItems = typeof items === 'string' ? JSON.parse(items) : items; } catch (e) {}
  let parsedReferenceIds = [];
  try { parsedReferenceIds = typeof referenceIds === 'string' ? JSON.parse(referenceIds) : referenceIds; } catch (e) {}

  const validation = await validateClientLedgerLimits(req.user.assignedCircle, req.user.assignedPackage, parsedItems, billType, stage);
  if (!validation.valid) {
    return res.status(400).json(new ApiResponse(400, null, validation.message));
  }

  const { invoiceDocUrl, diDocUrl, mhrovDocUrl, additionalDocsUrls } = await parseUploadedFiles(req.files as Express.Multer.File[]);

  const clientBill = new ClientBill({
    raBillNo,
    raBillDate,
    billType,
    stage,
    referenceType,
    referenceIds: parsedReferenceIds,
    items: parsedItems,
    invoiceDocUrl,
    diDocUrl,
    mhrovDocUrl,
    additionalDocsUrls,
    circle: req.user.assignedCircle,
    package: req.user.assignedPackage,
    createdBy: req.user._id,
    status: status || 'Pending PM Approval',
    linkedSupplyBillId: linkedSupplyBillId || undefined
  });

  await clientBill.save();
  return res.status(201).json(new ApiResponse(201, clientBill, 'Client Bill created successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CLIENT BILL
// ─────────────────────────────────────────────────────────────────────────────
export const updateClientBill = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const bill = await ClientBill.findById(id);

  if (!bill) return res.status(404).json(new ApiResponse(404, null, 'Client Bill not found'));

  const { raBillNo, raBillDate, billType, stage, referenceType, referenceIds, items, status, linkedSupplyBillId } = req.body;

  let parsedItems = [];
  try { parsedItems = typeof items === 'string' ? JSON.parse(items) : items; } catch (e) {}
  let parsedReferenceIds = [];
  try { parsedReferenceIds = typeof referenceIds === 'string' ? JSON.parse(referenceIds) : referenceIds; } catch (e) {}

  const validation = await validateClientLedgerLimits(bill.circle, bill.package, parsedItems, billType || bill.billType, stage || bill.stage, id);
  if (!validation.valid) {
    return res.status(400).json(new ApiResponse(400, null, validation.message));
  }

  const files = req.files as Express.Multer.File[];
  let invoiceDocUrl = bill.invoiceDocUrl;
  let diDocUrl = bill.diDocUrl;
  let mhrovDocUrl = bill.mhrovDocUrl;
  const additionalDocsUrls = [...(bill.additionalDocsUrls || [])];

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, 'client-bills');
      if (file.fieldname === 'invoiceDoc') invoiceDocUrl = result.secure_url;
      else if (file.fieldname === 'diDoc') diDocUrl = result.secure_url;
      else if (file.fieldname === 'mhrovDoc') mhrovDocUrl = result.secure_url;
      else if (file.fieldname === 'additionalDocs') additionalDocsUrls.push({ name: file.originalname, url: result.secure_url });
    }
  }

  bill.raBillNo = raBillNo || bill.raBillNo;
  bill.raBillDate = raBillDate || bill.raBillDate;
  bill.billType = billType || bill.billType;
  bill.stage = stage || bill.stage;
  bill.referenceType = referenceType || bill.referenceType;
  bill.referenceIds = parsedReferenceIds.length > 0 ? parsedReferenceIds : bill.referenceIds;
  bill.items = parsedItems.length > 0 ? parsedItems : bill.items;
  bill.status = status || bill.status;
  bill.invoiceDocUrl = invoiceDocUrl;
  bill.diDocUrl = diDocUrl;
  bill.mhrovDocUrl = mhrovDocUrl;
  bill.additionalDocsUrls = additionalDocsUrls;
  if (linkedSupplyBillId) bill.linkedSupplyBillId = linkedSupplyBillId;

  await bill.save();
  return res.status(200).json(new ApiResponse(200, bill, 'Client Bill updated successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL CLIENT BILLS
// ─────────────────────────────────────────────────────────────────────────────
export const getClientBills = asyncHandler(async (req: any, res: Response) => {
  let query: any = {};

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  if (req.user?.role?.name !== 'Super Admin') {
    if (req.user?.assignedCircle && req.user.assignedCircle !== 'All') {
      query.circle = { $regex: new RegExp(`^${escapeRegExp(req.user.assignedCircle)}$`, 'i') };
    }
    if (req.user?.assignedPackage && req.user.assignedPackage !== 'All') {
      query.package = { $regex: new RegExp(`^${escapeRegExp(req.user.assignedPackage)}$`, 'i') };
    }
  }

  if (req.query.circle && req.query.circle !== 'All') {
    query.circle = { $regex: new RegExp(`^${escapeRegExp(String(req.query.circle))}$`, 'i') };
  }
  if (req.query.package && req.query.package !== 'All') {
    query.package = { $regex: new RegExp(`^${escapeRegExp(String(req.query.package))}$`, 'i') };
  }

  const bills = await ClientBill.find(query)
    .populate('createdBy', 'name email role')
    .populate('parentBillId', 'raBillNo billType stage')
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, bills, 'Client Bills fetched successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET CLIENT BILL BY ID
// ─────────────────────────────────────────────────────────────────────────────
export const getClientBillById = asyncHandler(async (req: Request, res: Response) => {
  const bill = await ClientBill.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('parentBillId', 'raBillNo billType stage');
  if (!bill) {
    return res.status(404).json(new ApiResponse(404, null, 'Client Bill not found'));
  }
  return res.status(200).json(new ApiResponse(200, bill, 'Client Bill fetched successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET ERECTION REFERENCES — Returns Contractor 90% Invoices that are fully
// approved (Payment Processed), so the HO billing team can select them for
// the Client Erection 90% Bill. Populates jmcId so the JMC number shows.
// ─────────────────────────────────────────────────────────────────────────────
export const getErectionReferences = asyncHandler(async (req: any, res: Response) => {
  const filter: any = {
    stage: '90%',
    status: 'Payment Processed'
  };

  // Scope to user's circle/package if not Super Admin
  if (req.user?.role?.name !== 'Super Admin') {
    // ContractorInvoice has workOrderId — we filter via the work order's circle if stored
    // For now, return all fully-approved 90% invoices and let the frontend/user filter
  }

  const invoices = await ContractorInvoice.find(filter)
    .populate('jmcId', 'jmcNumber date circle package items')
    .populate('contractorId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  // Shape the response so each invoice exposes its JMC as the "reference" the
  // frontend dropdown expects: _id, jmcNumber, items (from jmcId)
  const shaped = invoices.map((inv: any) => ({
    _id: inv._id,
    jmcNumber: inv.jmcId?.jmcNumber || inv.invoiceNumber,
    date: inv.date,
    contractorName: inv.contractorId?.name || '',
    invoiceNumber: inv.invoiceNumber,
    jmcId: inv.jmcId,
    items: inv.jmcId?.items || inv.lineItems || []
  }));

  return res.status(200).json(new ApiResponse(200, shaped, 'Erection references fetched successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CLIENT BILL STATUS — with auto-trigger logic
// ─────────────────────────────────────────────────────────────────────────────
export const updateClientBillStatus = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { status, rejectionRemarks } = req.body;
  const bill = await ClientBill.findById(id);

  if (!bill) {
    return res.status(404).json(new ApiResponse(404, null, 'Client Bill not found'));
  }

  const previousStatus = bill.status;
  bill.status = status;

  if (status === 'Pending PD Approval') {
    bill.pmApprovedBy = req.user._id;
    bill.pmApprovedAt = new Date();
  } else if (previousStatus !== 'Approved' && status === 'Approved') {
    await updateClientLedgerOnApproval(bill);
    bill.pdApprovedBy = req.user._id;
    bill.pdApprovedAt = new Date();

    // ── AUTO-TRIGGER LOGIC ────────────────────────────────────────────────
    if (bill.billType === 'Erection') {

      // Find the linked Supply 60% bill for this circle/package
      // Prefer: explicitly set linkedSupplyBillId on the erection bill
      let supplySource = bill.linkedSupplyBillId
        ? await ClientBill.findById(bill.linkedSupplyBillId)
        : await ClientBill.findOne({
            billType: 'Supply',
            stage: '60%',
            status: 'Approved',
            circle: bill.circle,
            package: bill.package
          }).sort({ createdAt: -1 });

      if (supplySource) {
        if (bill.stage === '90%') {
          // Check if auto-bill already exists to prevent duplicates on re-approval
          const existingDraft = await ClientBill.findOne({ parentBillId: bill._id, stage: '30%' });
          if (!existingDraft) {
            // Auto-create Supply 30% Draft
            const thirtyPctItems = buildAutoSupplyItems(supplySource.items as any[], 30);
            const supplyDraft = new ClientBill({
              raBillNo: `${supplySource.raBillNo}-S30-AUTO`,
              raBillDate: new Date(),
              billType: 'Supply',
              stage: '30%',
              referenceType: supplySource.referenceType,
              referenceIds: supplySource.referenceIds,
              items: thirtyPctItems,
              circle: bill.circle,
              package: bill.package,
              createdBy: req.user._id,
              status: 'Draft',
              autoCreated: true,
              parentBillId: bill._id
            });
            await supplyDraft.save();
          }
        } else if (bill.stage === '10%') {
          // Check if auto-bill already exists to prevent duplicates on re-approval
          const existingDraft = await ClientBill.findOne({ parentBillId: bill._id, stage: '10%' });
          if (!existingDraft) {
            // Auto-create Supply 10% Draft
            const tenPctItems = buildAutoSupplyItems(supplySource.items as any[], 10);
            const supplyDraft = new ClientBill({
              raBillNo: `${supplySource.raBillNo}-S10-AUTO`,
              raBillDate: new Date(),
              billType: 'Supply',
              stage: '10%',
              referenceType: supplySource.referenceType,
              referenceIds: supplySource.referenceIds,
              items: tenPctItems,
              circle: bill.circle,
              package: bill.package,
              createdBy: req.user._id,
              status: 'Draft',
              autoCreated: true,
              parentBillId: bill._id
            });
            await supplyDraft.save();
          }
        }
      }
    }
    // ── END AUTO-TRIGGER ──────────────────────────────────────────────────
  } else if (status === 'Rejected') {
    bill.rejectedBy = req.user._id;
    bill.rejectedAt = new Date();
    bill.rejectionRemarks = rejectionRemarks;
  }

  await bill.save();
  return res.status(200).json(new ApiResponse(200, bill, `Client Bill status updated to ${status}`));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET CLIENT BILLING LEDGER
// ─────────────────────────────────────────────────────────────────────────────
export const getClientBillingLedger = asyncHandler(async (req: Request, res: Response) => {
  const { circle, package: packageStr } = req.query;
  
  if (!circle || !packageStr) {
    return res.status(400).json(new ApiResponse(400, null, 'Circle and Package are required'));
  }

  const ledger = await ClientBillingLedger.findOne({
    circle: { $regex: new RegExp(`^${circle}$`, 'i') },
    package: { $regex: new RegExp(`^${packageStr}$`, 'i') }
  }).populate('items.itemId', 'name description sku tempCode');

  if (!ledger) {
    return res.status(200).json(new ApiResponse(200, { items: [] }, 'No ledger found for this circle/package'));
  }

  return res.status(200).json(new ApiResponse(200, ledger, 'Client Billing Ledger fetched successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET CLIENT BILLING ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
export const getClientBillingAnalytics = asyncHandler(async (req: any, res: Response) => {
  let query: any = { status: { $ne: 'Rejected' } };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  if (req.user?.role?.name !== 'Super Admin') {
    if (req.user?.assignedCircle && req.user.assignedCircle !== 'All') {
      query.circle = { $regex: new RegExp(`^${escapeRegExp(req.user.assignedCircle)}$`, 'i') };
    }
    if (req.user?.assignedPackage && req.user.assignedPackage !== 'All') {
      query.package = { $regex: new RegExp(`^${escapeRegExp(req.user.assignedPackage)}$`, 'i') };
    }
  }

  if (req.query.circle && req.query.circle !== 'All') {
    query.circle = { $regex: new RegExp(`^${escapeRegExp(String(req.query.circle))}$`, 'i') };
  }
  if (req.query.package && req.query.package !== 'All') {
    query.package = { $regex: new RegExp(`^${escapeRegExp(String(req.query.package))}$`, 'i') };
  }

  // Aggregate by billType and stage to calculate totals correctly
  const bills = await ClientBill.find(query).select('billType stage status items createdAt');

  let supplyTotal = 0;
  let supplyCount = 0;
  let erectionTotal = 0;
  let erectionCount = 0;
  let unpaidTotal = 0;
  let unpaidCount = 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  bills.forEach((bill: any) => {
    // Calculate total amount for this bill
    let billTotal = 0;
    if (bill.items && bill.items.length > 0) {
      billTotal = bill.items.reduce((sum: number, item: any) => sum + (Number(item.totalAmount) || 0) + (Number(item.gstAmount) || 0), 0);
    }

    if (bill.billType === 'Supply') {
      supplyTotal += billTotal;
      supplyCount++;
    } else if (bill.billType === 'Erection') {
      erectionTotal += billTotal;
      erectionCount++;
    }

    // Unpaid (Aging) Logic
    if (['Pending PM Approval', 'Pending PD Approval', 'Pending HO Approval'].includes(bill.status) && new Date(bill.createdAt) < sevenDaysAgo) {
      unpaidTotal += billTotal;
      unpaidCount++;
    }
  });

  return res.status(200).json(new ApiResponse(200, {
    supplyTotal,
    supplyCount,
    erectionTotal,
    erectionCount,
    unpaidTotal,
    unpaidCount
  }, 'Client Billing analytics fetched successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CLIENT BILL
// ─────────────────────────────────────────────────────────────────────────────
export const deleteClientBill = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const bill = await ClientBill.findById(id);
  if (!bill) {
    return res.status(404).json(new ApiResponse(404, null, 'Client Bill not found'));
  }

  // Optional: Check if the bill is in a state that allows deletion (e.g., Draft or Rejected)
  if (bill.status !== 'Draft' && bill.status !== 'Rejected') {
    return res.status(400).json(new ApiResponse(400, null, `Cannot delete a bill in ${bill.status} status`));
  }

  await ClientBill.findByIdAndDelete(id);

  return res.status(200).json(new ApiResponse(200, null, 'Client Bill deleted successfully'));
});
