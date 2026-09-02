import { Request, Response } from 'express';
import { ClientBill } from './clientBill.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { v2 as cloudinary } from 'cloudinary';

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

export const createClientBill = asyncHandler(async (req: any, res: Response) => {
  const { raBillNo, raBillDate, billType, stage, referenceType, referenceIds, items, status } = req.body;
  
  if (req.user?.role?.name !== 'Super Admin' && (!req.user?.assignedCircle || !req.user?.assignedPackage)) {
    return res.status(400).json(new ApiResponse(400, null, 'User missing assigned circle/package'));
  }
  
  let parsedItems = [];
  try { parsedItems = typeof items === 'string' ? JSON.parse(items) : items; } catch (e) {}
  let parsedReferenceIds = [];
  try { parsedReferenceIds = typeof referenceIds === 'string' ? JSON.parse(referenceIds) : referenceIds; } catch (e) {}

  const files = req.files as Express.Multer.File[];
  let invoiceDocUrl = '';
  let diDocUrl = '';
  let mhrovDocUrl = '';
  const additionalDocsUrls: any[] = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadToCloudinary(file.buffer, 'client-bills');
      if (file.fieldname === 'invoiceDoc') {
        invoiceDocUrl = result.secure_url;
      } else if (file.fieldname === 'diDoc') {
        diDocUrl = result.secure_url;
      } else if (file.fieldname === 'mhrovDoc') {
        mhrovDocUrl = result.secure_url;
      } else if (file.fieldname === 'additionalDocs') {
        additionalDocsUrls.push({ name: file.originalname, url: result.secure_url });
      }
    }
  }

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
    status: status || 'Pending PM Approval'
  });
  
  await clientBill.save();
  return res.status(201).json(new ApiResponse(201, clientBill, 'Client Bill created successfully'));
});

export const updateClientBill = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const bill = await ClientBill.findById(id);
  
  if (!bill) return res.status(404).json(new ApiResponse(404, null, 'Client Bill not found'));
  
  const { raBillNo, raBillDate, billType, stage, referenceType, referenceIds, items, status } = req.body;

  let parsedItems = [];
  try { parsedItems = typeof items === 'string' ? JSON.parse(items) : items; } catch (e) {}
  let parsedReferenceIds = [];
  try { parsedReferenceIds = typeof referenceIds === 'string' ? JSON.parse(referenceIds) : referenceIds; } catch (e) {}

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

  await bill.save();
  return res.status(200).json(new ApiResponse(200, bill, 'Client Bill updated successfully'));
});

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
  
  const bills = await ClientBill.find(query).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, bills, 'Client Bills fetched successfully'));
});

export const getClientBillById = asyncHandler(async (req: Request, res: Response) => {
  const bill = await ClientBill.findById(req.params.id);
  if (!bill) {
    return res.status(404).json(new ApiResponse(404, null, 'Client Bill not found'));
  }
  return res.status(200).json(new ApiResponse(200, bill, 'Client Bill fetched successfully'));
});

export const updateClientBillStatus = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { status, rejectionRemarks } = req.body;
  const bill = await ClientBill.findById(id);
  
  if (!bill) {
    return res.status(404).json(new ApiResponse(404, null, 'Client Bill not found'));
  }
  
  bill.status = status;
  
  if (status === 'Pending PM Approval') {
    // submitted by Site Engineer
  } else if (status === 'Pending PD Approval') {
    bill.pmApprovedBy = req.user._id;
    bill.pmApprovedAt = new Date();
  } else if (status === 'Approved') {
    bill.pdApprovedBy = req.user._id;
    bill.pdApprovedAt = new Date();
    
    // Automation Logic
    if (bill.billType === 'Erection') {
      if (bill.stage === '90%') {
        const supplyDraft = new ClientBill({
          raBillNo: `${bill.raBillNo}-AUTO-SUPPLY-30`,
          raBillDate: new Date(),
          billType: 'Supply',
          stage: '30%',
          referenceType: bill.referenceType,
          referenceIds: bill.referenceIds,
          items: bill.items, // Needs to map to supply BOQ rates on frontend or here
          circle: bill.circle,
          package: bill.package,
          createdBy: req.user._id,
          status: 'Draft'
        });
        await supplyDraft.save();
      } else if (bill.stage === '10%') {
        const supplyDraft = new ClientBill({
          raBillNo: `${bill.raBillNo}-AUTO-SUPPLY-10`,
          raBillDate: new Date(),
          billType: 'Supply',
          stage: '10%',
          referenceType: bill.referenceType,
          referenceIds: bill.referenceIds,
          items: bill.items,
          circle: bill.circle,
          package: bill.package,
          createdBy: req.user._id,
          status: 'Draft'
        });
        await supplyDraft.save();
      }
    }
  } else if (status === 'Rejected') {
    bill.rejectedBy = req.user._id;
    bill.rejectedAt = new Date();
    bill.rejectionRemarks = rejectionRemarks;
  }
  
  await bill.save();
  return res.status(200).json(new ApiResponse(200, bill, `Client Bill status updated to ${status}`));
});
