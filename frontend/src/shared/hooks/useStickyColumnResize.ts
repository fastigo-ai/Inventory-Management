import { useEffect } from 'react';

/**
 * Hook to dynamically update CSS variables for sticky column offsets when they are resized.
 * This allows CSS sticky columns to be resized dynamically by adjusting the `left` offset of subsequent columns.
 */
export function useStickyColumnResize(tableSelector: string = 'table') {
  useEffect(() => {
    const root = document.documentElement;
    let observer: ResizeObserver | null = null;
    let pollInterval: NodeJS.Timeout;

    const setupObserver = () => {
      const srCol = document.querySelector('.dn-sticky-sr') as HTMLElement;
      const mcCol = document.querySelector('.dn-sticky-mc') as HTMLElement;
      const nameCol = document.querySelector('.dn-sticky-name') as HTMLElement;
      const actCol = document.querySelector('.dn-sticky-act') as HTMLElement;
      
      const newNameCol = document.querySelector('.dn-new-name') as HTMLElement;
      const newActCol = document.querySelector('.dn-new-act') as HTMLElement;
      const newMcCol = document.querySelector('.dn-new-mc') as HTMLElement;
      const newLoaCol = document.querySelector('.dn-new-loa') as HTMLElement;

      if (!newNameCol && !nameCol) return false; // not rendered yet

      observer = new ResizeObserver(() => {
      if (srCol && mcCol && nameCol && actCol) {
        const srWidth = srCol.offsetWidth;
        const mcWidth = mcCol.offsetWidth;
        const nameWidth = nameCol.offsetWidth;
        const actWidth = actCol.offsetWidth;

        root.style.setProperty('--sticky-left-2', `${srWidth}px`);
        root.style.setProperty('--sticky-left-3', `${srWidth + mcWidth}px`);
        root.style.setProperty('--sticky-left-4', `${srWidth + mcWidth + nameWidth}px`);
        root.style.setProperty('--sticky-left-5', `${srWidth + mcWidth + nameWidth + actWidth}px`);
      }

      if (newNameCol && newActCol && newMcCol && newLoaCol) {
        const nameWidth = newNameCol.offsetWidth;
        const actWidth = newActCol.offsetWidth;
        const mcWidth = newMcCol.offsetWidth;
        const loaWidth = newLoaCol.offsetWidth;

        root.style.setProperty('--new-left-2', `${nameWidth}px`);
        root.style.setProperty('--new-left-3', `${nameWidth + actWidth}px`);
        root.style.setProperty('--new-left-4', `${nameWidth + actWidth + mcWidth}px`);
        root.style.setProperty('--new-left-5', `${nameWidth + actWidth + mcWidth + loaWidth}px`);
      }
    });

    if (srCol) observer.observe(srCol);
    if (mcCol) observer.observe(mcCol);
    if (nameCol) observer.observe(nameCol);
    if (actCol) observer.observe(actCol);

    if (newNameCol) observer.observe(newNameCol);
    if (newActCol) observer.observe(newActCol);
    if (newMcCol) observer.observe(newMcCol);
    if (newLoaCol) observer.observe(newLoaCol);
    
    return true; // success
  };

  const attemptSetup = () => {
    if (setupObserver()) {
      if (pollInterval) clearInterval(pollInterval);
    }
  };

  // Attempt immediately, then poll every 500ms until successful
  attemptSetup();
  pollInterval = setInterval(attemptSetup, 500);

  return () => {
    if (pollInterval) clearInterval(pollInterval);
    if (observer) observer.disconnect();
  };
  }, [tableSelector]);
}
