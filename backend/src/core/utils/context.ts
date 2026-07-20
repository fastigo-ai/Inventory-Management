import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId?: string;
  companyId?: string;
  branchId?: string;
  ip?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  os?: string;
  requestId?: string;
  route?: string;
  method?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getContext = (): RequestContext | undefined => {
  return requestContext.getStore();
};
