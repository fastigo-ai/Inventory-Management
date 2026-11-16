/**
 * Safely format date strings or timestamps, automatically handling:
 * - Standard ISO/UTC strings
 * - Excel numeric serial dates (e.g., 45884 -> 15/08/2025)
 * - Years accidentally saved as 45884+
 */
export function formatDate(dateVal: any, fallback: string = '-'): string {
  if (!dateVal) return fallback;
  
  if (typeof dateVal === 'number' && dateVal >= 30000 && dateVal <= 60000) {
    const fixed = new Date((dateVal - 25569) * 86400 * 1000);
    return isNaN(fixed.getTime()) ? fallback : fixed.toLocaleDateString();
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return fallback;

  const year = d.getUTCFullYear();
  if (year >= 30000 && year <= 60000) {
    const fixed = new Date((year - 25569) * 86400 * 1000);
    return isNaN(fixed.getTime()) ? fallback : fixed.toLocaleDateString();
  }

  return d.toLocaleDateString();
}
