const xlsx = require('xlsx');
const fs = require('fs');

const filePath = '/Users/Apple/Desktop/JMC PORTAL.xlsx';
const buffer = fs.readFileSync(filePath);
const workbook = xlsx.read(buffer, { type: 'buffer' });

console.log("Sheet names:", workbook.SheetNames);
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} (${data.length} rows) ---`);
  if (data.length > 0) {
    console.log("Row 1:", data[0]);
    console.log("Row 2:", data[1]);
    console.log("Row 3:", data[2]);
  }
}
