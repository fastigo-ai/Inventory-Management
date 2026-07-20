import { AsyncLocalStorage } from 'async_hooks';
export const requestContext = new AsyncLocalStorage();
export const getContext = () => {
    return requestContext.getStore();
};
