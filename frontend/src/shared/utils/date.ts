/**
 * Safely format date strings or timestamps, automatically handling:
 * - Standard ISO/UTC strings
 * - Excel numeric serial dates (e.g., 45884 -> 15/08/2025)
 * - Years accidentally saved as 45884+
 */
export function formatDate(dateVal: any, fallback: string = '-'): string {
  if (!dateVal) return fallback;
  
  // Handle numeric or string Excel serial dates (e.g. 45884, "46119")
  const num = typeof dateVal === 'number' 
    ? dateVal 
    : (typeof dateVal === 'string' && /^\d+(\.\d+)?$/.test(dateVal.trim()) ? Number(dateVal.trim()) : NaN);

  if (!isNaN(num) && num >= 30000 && num <= 65000) {
    const fixed = new Date((num - 25569) * 86400 * 1000);
    return isNaN(fixed.getTime()) ? fallback : fixed.toLocaleDateString();
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return fallback;

  // Handle cases where the year itself was parsed as an Excel serial (e.g. year 46119)
  const localYear = d.getFullYear();
  const utcYear = d.getUTCFullYear();
  const checkYear = (localYear >= 30000 && localYear <= 65000) 
    ? localYear 
    : ((utcYear >= 30000 && utcYear <= 65000) ? utcYear : null);

  if (checkYear) {
    const fixed = new Date((checkYear - 25569) * 86400 * 1000);
    return isNaN(fixed.getTime()) ? fallback : fixed.toLocaleDateString();
  }

  return d.toLocaleDateString();
}
