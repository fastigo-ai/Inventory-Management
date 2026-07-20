import { Request, Response, NextFunction } from 'express';
import { requestContext, RequestContext } from '../utils/context';
import crypto from 'crypto';

export const contextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  const userAgent = req.headers['user-agent'] || '';
  
  // Basic naive parsing for browser and os (in a real app, use ua-parser-js)
  let browser = 'Unknown';
  let os = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'Mac OS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';

  const context: RequestContext = {
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
    userAgent,
    browser,
    os,
    requestId,
    route: req.originalUrl,
    method: req.method,
  };

  requestContext.run(context, () => {
    next();
  });
};

export const attachUserToContext = (req: any, res: Response, next: NextFunction) => {
  const store = requestContext.getStore();
  if (store && req.user) {
    store.userId = req.user._id?.toString();
    store.companyId = req.user.companyId?.toString(); // If user has companyId
    store.branchId = req.user.branchId?.toString(); // If user has branchId
  }
  next();
};
