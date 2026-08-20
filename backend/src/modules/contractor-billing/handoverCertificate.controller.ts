import { Request, Response } from 'express';
import { HandoverCertificate } from './handoverCertificate.schema';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { ApiError } from '../../core/utils/ApiError';
import { asyncHandler } from '../../core/utils/asyncHandler';

export const createHandoverCertificate = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const user = (req as any).user;

  const count = await HandoverCertificate.countDocuments();
  data.certificateNumber = `HOC/${new Date().getFullYear().toString().slice(-2)}/${(count + 1).toString().padStart(4, '0')}`;
  data.createdBy = user._id;

  const certificate = await HandoverCertificate.create(data);

  res.status(201).json(new ApiResponse(201, certificate, 'Handover Certificate created successfully'));
});

export const getHandoverCertificates = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const filter: any = {};

  if (user && user.role?.name === 'Contractor' && user.contractorId) {
    filter.contractorId = user.contractorId;
  }

  const certificates = await HandoverCertificate.find(filter)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber')
    .sort({ createdAt: 1 });

  res.status(200).json(new ApiResponse(200, certificates, 'Handover Certificates fetched successfully'));
});

export const getHandoverCertificateById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const certificate = await HandoverCertificate.findById(id)
    .populate('contractorId', 'name vendorName dynamicData')
    .populate('workOrderId', 'workOrderNumber');

  if (!certificate) throw new ApiError(404, 'Handover Certificate not found');

  res.status(200).json(new ApiResponse(200, certificate, 'Handover Certificate fetched successfully'));
});

export const updateHandoverCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const certificate = await HandoverCertificate.findById(id);
  if (!certificate) throw new ApiError(404, 'Handover Certificate not found');

  const updatedCertificate = await HandoverCertificate.findByIdAndUpdate(
    id,
    data,
    { new: true, runValidators: true }
  );

  res.status(200).json(new ApiResponse(200, updatedCertificate, 'Handover Certificate updated successfully'));
});
