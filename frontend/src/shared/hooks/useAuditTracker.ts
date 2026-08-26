'use client';

import { useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackAuditEvents, AuditEvent } from '@/features/audit/api/audit.api';

const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;

let globalQueue: AuditEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

const scheduledFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, FLUSH_INTERVAL_MS);
};

const flushQueue = async () => {
  if (isFlushing || globalQueue.length === 0) return;
  isFlushing = true;
  const batch = globalQueue.splice(0, BATCH_SIZE);
  try {
    await trackAuditEvents(batch);
  } catch {
    // silent failure
  } finally {
    isFlushing = false;
    if (globalQueue.length > 0) flushQueue();
  }
};

const enqueue = (event: AuditEvent) => {
  globalQueue.push({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });
  if (globalQueue.length >= BATCH_SIZE) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushQueue();
  } else {
    scheduledFlush();
  }
};

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushQueue();
  });
  window.addEventListener('beforeunload', () => flushQueue());
}

/**
 * useAuditTracker
 * Provides helper functions to track user actions.
 * All events are batched and sent to /api/audit/track.
 */
export const useAuditTracker = () => {
  const pathname = usePathname();

  const trackClick = useCallback((
    label: string,
    options?: {
      component?: string;
      entityType?: string;
      entityId?: string;
      module?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    enqueue({
      action: 'CLICK',
      label,
      page: pathname,
      route: pathname,
      entityType: options?.entityType || 'UI',
      entityId: options?.entityId,
      module: options?.module,
      component: options?.component,
      description: `Clicked: ${label}`,
      metadata: options?.metadata,
      status: 'success',
    });
  }, [pathname]);

  const trackAction = useCallback((
    action: string,
    label: string,
    options?: {
      entityType?: string;
      entityId?: string;
      module?: string;
      status?: 'success' | 'failed';
      metadata?: Record<string, any>;
    }
  ) => {
    enqueue({
      action,
      label,
      page: pathname,
      route: pathname,
      entityType: options?.entityType || 'UI',
      entityId: options?.entityId,
      module: options?.module,
      description: `${action}: ${label}`,
      status: options?.status || 'success',
      metadata: options?.metadata,
    });
  }, [pathname]);

  const trackView = useCallback((
    pageName: string,
    metadata?: Record<string, any>
  ) => {
    enqueue({
      action: 'VIEW',
      entityType: 'Page',
      page: pathname,
      route: pathname,
      label: pageName,
      description: `Viewed: ${pageName}`,
      metadata,
      status: 'success',
    });
  }, [pathname]);

  const trackSearch = useCallback((
    query: string,
    module?: string,
    metadata?: Record<string, any>
  ) => {
    enqueue({
      action: 'SEARCH',
      entityType: 'UI',
      page: pathname,
      module,
      label: query,
      description: `Searched: "${query}"${module ? ` in ${module}` : ''}`,
      metadata,
      status: 'success',
    });
  }, [pathname]);

  const trackExport = useCallback((
    format: string,
    module?: string,
    metadata?: Record<string, any>
  ) => {
    enqueue({
      action: 'EXPORT',
      entityType: 'UI',
      page: pathname,
      module,
      label: `Export ${format}`,
      description: `Exported ${format}${module ? ` from ${module}` : ''}`,
      metadata,
      status: 'success',
    });
  }, [pathname]);

  const trackError = useCallback((
    label: string,
    error: string,
    module?: string
  ) => {
    enqueue({
      action: 'API_ERROR',
      entityType: 'UI',
      page: pathname,
      module,
      label,
      description: `Error: ${label} — ${error}`,
      status: 'failed',
      metadata: { error },
    });
  }, [pathname]);

  return {
    trackClick,
    trackAction,
    trackView,
    trackSearch,
    trackExport,
    trackError,
  };
};
