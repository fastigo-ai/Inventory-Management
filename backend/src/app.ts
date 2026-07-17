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
import locationRoutes from './modules/locations/location.routes';
import vendorRoutes from './modules/vendors/vendor.routes';
import { errorHandler } from './core/middlewares/error.middleware';

const app: Express = express();

// Middlewares
app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'https://seashell-app-r36uj.ondigitalocean.app',
  'https://erp.fastigo.co',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/vendors', vendorRoutes);

// Mount API routes on both / and /api to handle DigitalOcean path stripping
app.use('/', apiRouter);
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
