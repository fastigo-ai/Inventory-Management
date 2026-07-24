import { parse } from 'csv-parse/sync';

/**
 * Parses and sanitizes a CSV buffer by:
 * - Trimming headers and removing BOM characters
 * - Trimming values and removing carriage returns
 * - Skipping empty lines
 * @param buffer - The CSV file buffer or string
 * @returns An array of sanitized parsed objects
 */
export const parseAndSanitizeCsv = (buffer: Buffer | string): any[] => {
  return parse(buffer, {
    columns: (headers: string[]) => 
      headers.map((h: string) => h.trim().replace(/^\uFEFF/, '').replace(/\r/g, '')),
    skip_empty_lines: true,
    trim: true,
    bom: true,
    cast: (value: any) => {
      if (typeof value === 'string') {
        return value.replace(/\r/g, '').trim();
      }
      return value;
    }
  });
};
