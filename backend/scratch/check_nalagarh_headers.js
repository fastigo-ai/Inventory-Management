const xlsx = require('xlsx');

const workbook = xlsx.readFile('C:\\Users\\sanjeet kumar\\Downloads\\NALAGARH STORE  STOCK 21-09-2026.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
for(let i=0; i<10; i++) {
  console.log(`Row ${i}:`, data[i]);
}
