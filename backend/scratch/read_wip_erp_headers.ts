import * as xlsx from 'xlsx';
import * as path from 'path';

const fileBuffer = require('fs').readFileSync('/Users/Apple/Desktop/wip erp all (2).xlsx');
const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });

console.log("Full Row 9 (Headers):", rows[9]);

// Let's also find where the 'Activity' grouping is defined
for(let i=10; i<30; i++) {
  console.log(`Row ${i}:`, rows[i].slice(0, 4));
}
