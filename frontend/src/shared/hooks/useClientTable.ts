import { useState, useMemo } from 'react';

export function useClientTable<T extends Record<string, any>>(data: T[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const lowercasedTerm = searchTerm.toLowerCase();
    
    return data.filter((item) => {
      // Recursively search object values
      const searchInObject = (obj: any): boolean => {
        if (!obj) return false;
        
        for (const key in obj) {
          const val = obj[key];
          
          if (typeof val === 'string' || typeof val === 'number') {
            if (String(val).toLowerCase().includes(lowercasedTerm)) {
              return true;
            }
          } else if (typeof val === 'object') {
             if (searchInObject(val)) return true;
          }
        }
        return false;
      };

      return searchInObject(item);
    });
  }, [data, searchTerm]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is valid when data changes
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  // If we had to adjust the page down, update the state
  if (validCurrentPage !== currentPage && validCurrentPage > 0) {
     setCurrentPage(validCurrentPage);
  }

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, validCurrentPage, pageSize]);

  return {
    paginatedData,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage: validCurrentPage,
    setCurrentPage,
    totalPages,
    totalItems
  };
}
