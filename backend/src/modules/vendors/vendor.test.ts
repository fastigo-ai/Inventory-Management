import request from 'supertest';
import app from '../../app';

// Mock authentication middleware
jest.mock('../../core/middlewares/auth.middleware', () => {
  return {
    authenticate: (req: any, res: any, next: any) => {
      req.user = { _id: '123', companyId: 'comp1', branchId: 'branch1' };
      next();
    },
    authorize: () => (req: any, res: any, next: any) => next(),
    requireRole: () => (req: any, res: any, next: any) => next()
  };
});

jest.mock('../../modules/metadata/metadata.model', () => {
  return {
    __esModule: true,
    default: {
      findOne: jest.fn().mockResolvedValue({
        entityName: 'Vendor',
        fields: [
          { label: 'ID (Optional)', name: 'id' },
          { label: 'Vendor Code', name: 'vendorCode' },
          { label: 'Company Name', name: 'companyName' }
        ]
      })
    }
  };
});

describe('Vendor Routes', () => {
  describe('GET /vendors/template', () => {
    it('should return a CSV template for vendor import', async () => {
      const response = await request(app).get('/vendors/template');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment; filename="vendors_template.csv"');
      
      // The template should contain specific columns
      expect(response.text).toContain('ID (Optional)');
      expect(response.text).toContain('Vendor Code');
      expect(response.text).toContain('Company Name');
    });
  });
});
