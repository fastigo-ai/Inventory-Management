import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import authRoutes from './modules/auth/auth.routes';
import roleRoutes from './modules/roles/role.routes';
import userRoutes from './modules/users/user.routes';
import metadataRoutes from './modules/metadata/metadata.routes';
import itemRoutes from './modules/items/item.routes';
import purchaseRoutes from './modules/purchases/purchase.routes';
import documentRoutes from './modules/documents/document.routes';
import locationRoutes from './modules/locations/location.routes';
import vendorRoutes from './modules/vendors/vendor.routes';
import diRoutes from './modules/di/di.routes';
import contractorRoutes from './modules/contractors/contractor.routes';
import billingCompanyRoutes from './modules/billing-companies/billingCompany.routes';
import auditRoutes from './modules/audit/audit.routes';
import storeRoutes from './modules/store/store.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportRoutes from './modules/reports/summary/summary.routes';
import integrationRoutes from './modules/integrations/integrations.routes';
import demandNoteRoutes from './modules/demand-notes/demandNote.routes';
import allocationRoutes from './core/document-engine/allocation/allocation.routes';
import relationsRoutes from './core/document-engine/relations/relations.routes';
import contractorWorkOrderRoutes from './modules/contractors/contractorWorkOrder.routes';
import jmcRoutes from './modules/jmc/jmc.routes';
import wipRoutes from './modules/wip/wip.routes';
import wipRequiredRoutes from './modules/wip-required/wipRequired.routes';
import billingRoutes from './modules/contractor-billing/billing.routes';
import { errorHandler } from './core/middlewares/error.middleware';

import { contextMiddleware } from './core/middlewares/context.middleware';
import rateLimit from 'express-rate-limit';

const app: Express = express();

// Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Middlewares
app.use(apiLimiter);
app.use(contextMiddleware);
app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'seashell-app-r36uj.ondigitalocean.app',
  'fastigo.co',
  process.env.CLIENT_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(o => origin.includes(o));
    if (isAllowed) {
      callback(null, true);
    } else {
      // Gracefully reject without crashing the preflight request
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(compression());

import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', message: 'ERP Backend is running.' });
});

const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/roles', roleRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/metadata', metadataRoutes);
apiRouter.use('/items', itemRoutes);
apiRouter.use('/purchases', purchaseRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/vendors', vendorRoutes);
apiRouter.use('/di', diRoutes);
apiRouter.use('/contractors', contractorRoutes);
apiRouter.use('/billing-companies', billingCompanyRoutes);
apiRouter.use('/audit', auditRoutes);
apiRouter.use('/store', storeRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/integrations', integrationRoutes);
apiRouter.use('/demand-notes', demandNoteRoutes);
apiRouter.use('/allocations', allocationRoutes);
apiRouter.use('/relations', relationsRoutes);
apiRouter.use('/ho-billing/contractor-work-orders', contractorWorkOrderRoutes);
apiRouter.use('/jmc', jmcRoutes);
apiRouter.use('/wip', wipRoutes);
apiRouter.use('/wip-required', wipRequiredRoutes);
apiRouter.use('/contractor-billing', billingRoutes);

// Mount API routes on both / and /api to handle DigitalOcean path stripping
app.use('/', apiRouter);
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
