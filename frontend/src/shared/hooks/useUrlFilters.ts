import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebounce } from './useDebounce';

/**
 * A hook to sync local filter state with the URL query parameters.
 * Automatically initializes state from the URL and updates the URL when debounced state changes.
 */
export function useUrlFilters<T extends Record<string, string>>(initialFilters: T, debounceMs = 500) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  // Initialize state from URL params or fallback to initialFilters
  const getInitialState = () => {
    const state: any = {};
    Object.keys(initialFilters).forEach(key => {
      const urlValue = searchParams.get(key);
      state[key] = urlValue !== null ? urlValue : initialFilters[key];
    });
    return state as T;
  };

  const [filters, setFilters] = useState<T>(getInitialState);
  
  // Debounce the entire filters object for URL updating and API calling
  const debouncedFilters = useDebounce(filters, debounceMs);

  // Update URL whenever debouncedFilters change (except on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const current = new URLSearchParams(Array.from(searchParams.entries()));
    let hasChanges = false;

    Object.entries(debouncedFilters).forEach(([key, value]) => {
      const stringValue = String(value || "").trim();
      if (stringValue) {
        if (current.get(key) !== stringValue) {
          current.set(key, stringValue);
          hasChanges = true;
        }
      } else {
        if (current.has(key)) {
          current.delete(key);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.replace(`${pathname}${query}`, { scroll: false });
    }
  }, [debouncedFilters, pathname, router, searchParams]);

  const setFilter = (key: keyof T, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return {
    filters,
    setFilter,
    setFilters,
    debouncedFilters,
  };
}
