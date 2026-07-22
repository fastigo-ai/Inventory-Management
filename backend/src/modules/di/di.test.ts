import request from 'supertest';
import app from '../../app';
import { connectDB, closeDB, clearDB } from '../../core/test-utils/db';
import { DI } from './di.schema';
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

describe('DI API', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('Dispatch Instructions', () => {
    it('should delete a DI and return 200', async () => {
      // 1. Create a DI
      const di = await DI.create({
        diNumber: 'DI-TEST-001',
        date: new Date(),
        status: 'Active'
      });

      // 2. Delete the DI via API
      const response = await request(app).delete(`/di/${di._id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // 3. Verify it is deleted from DB
      const foundDi = await DI.findById(di._id);
      expect(foundDi).toBeNull();
    });
  });
});
