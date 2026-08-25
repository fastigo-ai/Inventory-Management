export const SUB_STORE_MAP: Record<string, string[]> = {
  'Solan': ['Solan', 'Kumarhatti', 'Nalagarh'],
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
