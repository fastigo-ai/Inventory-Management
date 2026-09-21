import * as xlsx from 'xlsx';
import * as path from 'path';

const fileBuffer = require('fs').readFileSync('/Users/Apple/Desktop/wip erp all (2).xlsx');
const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const sheet = workbook.Sheets['Sheet1'];
const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });

console.log("Headers (Row 8-10):");
console.log(rows[7]);
console.log(rows[8]);
console.log(rows[9]);

console.log("\nRow 1312:");
console.log(rows[1311]);

console.log("\nRow 1390:");
console.log(rows[1389]);
