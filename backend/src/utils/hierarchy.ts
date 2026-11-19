export const SUB_STORE_MAP: Record<string, string[]> = {
  'Solan': ['Solan', 'Kumarhatti', 'Nalagarh', 'Dharampur', 'Arki'],
  'Kumarhatti': ['Kumarhatti', 'Solan'],
  'Nalagarh': ['Nalagarh', 'Solan'],
  'Nahan': ['Nahan'],
  'Rohru': ['Rohru'],
  'Rampur': ['Rampur'],
};

export const expandCircle = (circle: string | undefined | null): string[] | null => {
  if (!circle || circle.toLowerCase() === 'all') return null;
  
  // Normalize circle string (e.g. "Solan" from "Store Solan" if needed, but usually just exact match)
  const normalized = circle.trim();
  
  // Find case-insensitive match in SUB_STORE_MAP
  const key = Object.keys(SUB_STORE_MAP).find(k => k.toLowerCase() === normalized.toLowerCase());
  
  if (key) {
    return SUB_STORE_MAP[key];
  }
  
  return [normalized];
};

/**
 * Extracts canonical store name from strings like:
 * "Rohru - Rohru" -> "Rohru"
 * "Solan - Kumarhatti" -> "Kumarhatti"
 * "Solan - Nalagarh" -> "Nalagarh"
 * "KUMARHATTI STORE" -> "Kumarhatti"
 */
export const extractCanonicalStoreName = (raw?: string | null): string => {
  if (!raw) return '';
  let str = String(raw).trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    str = parts[parts.length - 1].trim();
  }
  str = str.replace(/\b(store|circle)\b/gi, '').trim();
  if (!str) return '';

  if (/kuma[rh]*hat[ti]+/i.test(str)) return 'Kumarhatti';
  if (/nalagarh/i.test(str)) return 'Nalagarh';
  if (/rohru/i.test(str)) return 'Rohru';
  if (/rampur/i.test(str)) return 'Rampur';
  if (/nahan/i.test(str)) return 'Nahan';
  if (/solan/i.test(str)) return 'Solan';
  if (/arki/i.test(str)) return 'Arki';
  if (/dhar[a]?mpur/i.test(str)) return 'Dharampur';
  
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const normalizeStore = (name?: string | null): string => {
  if (!name) return '';
  const clean = name.trim().toLowerCase().replace(/\bstore\b/g, '').replace(/[\s\-_]+/g, ' ').trim();
  if (/solan|kumar\s*hat[ti]+|nalagarh/.test(clean)) return 'Solan';
  if (/nahan/.test(clean)) return 'Nahan';
  if (/rampur/.test(clean)) return 'Rampur';
  if (/rohru/.test(clean)) return 'Rohru';
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '';
};
