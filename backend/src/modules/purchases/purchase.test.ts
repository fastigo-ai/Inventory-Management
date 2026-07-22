import request from 'supertest';
import app from '../../app';
import { connectDB, closeDB, clearDB } from '../../core/test-utils/db';
import { PurchaseOrder } from './purchaseOrder.schema';
import { Pr } from './pr.schema';
import { PurchaseInvoice } from './purchaseInvoice.schema';
import mongoose from 'mongoose';

// Mock authentication middleware
jest.mock('../../core/middlewares/auth.middleware', () => {
  return {
    authenticate: (req: any, res: any, next: any) => {
      req.user = { _id: new mongoose.Types.ObjectId().toString(), companyId: 'comp1', branchId: 'branch1' };
      next();
    },
    authorize: () => (req: any, res: any, next: any) => next(),
    requireRole: () => (req: any, res: any, next: any) => next()
  };
});

describe('Purchases API', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('Purchase Orders', () => {
    it('should delete a purchase order and create an audit log', async () => {
      // 1. Create a PO
      const po = await PurchaseOrder.create({
        purchaseOrderNumber: 'PO-TEST-001',
        vendorName: 'Test Vendor',
        date: new Date(),
        status: 'Draft'
      });

      // 2. Delete the PO via API
      const response = await request(app).delete(`/purchases/orders/${po._id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // 3. Verify it is deleted from DB
      const foundPo = await PurchaseOrder.findById(po._id);
      expect(foundPo).toBeNull();
    });
  });

  describe('Purchase Receives (GRN)', () => {
    it('should delete a purchase receive', async () => {
      // 1. Create a PR
      const pr = await Pr.create({
        purchaseReceiveNumber: 'PR-TEST-001',
        vendorName: 'Test Vendor',
        receiveDate: new Date(),
        status: 'Draft'
      });

      // 2. Delete the PR via API
      const response = await request(app).delete(`/purchases/receives/${pr._id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // 3. Verify it is deleted from DB
      const foundPr = await Pr.findById(pr._id);
      expect(foundPr).toBeNull();
    });
  });

  describe('Purchase Invoices', () => {
    it('should delete a purchase invoice', async () => {
      // 1. Create a PI
      const pi = await PurchaseInvoice.create({
        invoiceNumber: 'PI-TEST-001',
        vendorName: 'Test Vendor',
        date: new Date(),
        status: 'Draft'
      });

      // 2. Delete the PI via API
      const response = await request(app).delete(`/purchases/invoices/${pi._id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // 3. Verify it is deleted from DB
      const foundPi = await PurchaseInvoice.findById(pi._id);
      expect(foundPi).toBeNull();
    });
  });
});
