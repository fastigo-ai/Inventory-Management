import { useState, useRef, useEffect, useCallback } from 'react';

export function useResizableColumns(
  tableKey?: string,
  initialWidths: Record<string, number> = {}
) {
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined' && tableKey) {
      try {
        const saved = localStorage.getItem(`col_widths_${tableKey}`);
        if (saved) return { ...initialWidths, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load column widths', e);
      }
    }
    return initialWidths;
  });

  const resizingRef = useRef<{ id: string; startX: number; startW: number } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const active = resizingRef.current;
    if (!active) return;
    const diff = e.pageX - active.startX;
    const newW = Math.max(40, active.startW + diff);
    setColWidths(prev => {
      const updated = { ...prev, [active.id]: newW };
      if (typeof window !== 'undefined' && tableKey) {
        try {
          localStorage.setItem(`col_widths_${tableKey}`, JSON.stringify(updated));
        } catch (_) {}
      }
      return updated;
    });
  }, [tableKey]);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent, colId: string, currentWidth?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const thElement = (e.currentTarget.parentElement as HTMLElement);
    const startW = currentWidth || (thElement ? thElement.getBoundingClientRect().width : 100);
    
    resizingRef.current = { id: colId, startX: e.pageX, startW };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    colWidths,
    handleMouseDown,
    setColWidths
  };
}
