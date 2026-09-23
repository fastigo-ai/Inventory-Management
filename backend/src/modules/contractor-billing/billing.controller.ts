import { Request, Response } from 'express';
import { ApiResponse } from '../../core/utils/ApiResponse';
import { asyncHandler } from '../../core/utils/asyncHandler';
import { 
  createInvoiceService, 
  updateInvoiceService, 
  getInvoicesService, 
  getInvoiceByIdService, 
  updateInvoiceStatusService, 
  getBillingAnalyticsService 
} from './billing.service';

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const invoice = await createInvoiceService(req.body, user);
  res.status(201).json(new ApiResponse(201, invoice, 'Contractor Invoice created successfully'));
});

export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;
  const invoice = await updateInvoiceService(id as string, req.body, user);
  res.status(200).json(new ApiResponse(200, invoice, 'Contractor Invoice updated successfully'));
});

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const invoices = await getInvoicesService(req.query, user);
  res.status(200).json(new ApiResponse(200, invoices, 'Invoices fetched successfully'));
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await getInvoiceByIdService(id as string);
  res.status(200).json(new ApiResponse(200, invoice, 'Invoice fetched successfully'));
});

export const updateInvoiceStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  const user = (req as any).user;
  const invoice = await updateInvoiceStatusService(id as string, status, remarks, user);
  res.status(200).json(new ApiResponse(200, invoice, 'Invoice status updated successfully'));
});

export const getBillingAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await getBillingAnalyticsService();
  res.status(200).json(new ApiResponse(200, analytics, 'Billing analytics fetched successfully'));
});
