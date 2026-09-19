const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('C:', 'Users', 'sanjeet kumar', 'Desktop', 'Jmc_Export (4).xlsx');

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`Read ${rows.length} rows from ${sheetName}`);
  
  let currentActivity = "";
  for(let i=0; i<rows.length; i++) {
     const row = rows[i];
     if (row[0] && typeof row[0] === 'string' && !row[1]) {
         currentActivity = row[0];
     }
     
     if (row[3] && typeof row[3] === 'string' && row[3].includes('Angle Iron')) {
         console.log(`Row ${i+1}: LOA ${row[1]}, Desc ${row[3]}`);
         console.log(`   Quantities: ${row.slice(5, 15).join(', ')}`);
     }
  }
} catch (e) {
  console.error(e);
}
