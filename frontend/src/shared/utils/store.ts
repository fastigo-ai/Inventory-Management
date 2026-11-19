/**
 * Normalizes store name string so that compound or legacy names like:
 * "Rohru - Rohru" -> "Rohru"
 * "Solan - Kumarhatti" -> "Kumarhatti"
 * "Solan - Nalagarh" -> "Nalagarh"
 * "KUMARHATTI STORE" -> "Kumarhatti"
 * cleanly reduce to the canonical last store name.
 */
export function normalizeStoreName(raw?: string | null): string {
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
}
