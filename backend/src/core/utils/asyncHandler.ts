import { Request, Response, NextFunction } from 'express';

import { requestContext } from './context';

const asyncHandler = (requestHandler: (req: Request, res: Response, next: NextFunction) => Promise<any> | void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const store = requestContext.getStore();
    
    // Restore context if lost by middlewares like multer
    if (!store && (req as any).user) {
      const user = (req as any).user;
      const context = {
        userId: user._id?.toString(),
        companyId: user.companyId?.toString(),
        branchId: user.branchId?.toString(),
        ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        route: req.originalUrl,
        method: req.method,
      };
      
      requestContext.run(context, () => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
      });
    } else {
      // If store exists but missing userId (rare, but possible if partially lost)
      if (store && !store.userId && (req as any).user) {
        store.userId = (req as any).user._id?.toString();
        store.companyId = (req as any).user.companyId?.toString();
        store.branchId = (req as any).user.branchId?.toString();
      }
      Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    }
  };
};

export { asyncHandler };
