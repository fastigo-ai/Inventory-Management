import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('c:\\Users\\sanjeet kumar\\Desktop\\jmc nahan.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

for (let r = 0; r < Math.min(15, rows.length); r++) {
  console.log(`Row ${r}:`, JSON.stringify(rows[r]).substring(0, 150));
}
