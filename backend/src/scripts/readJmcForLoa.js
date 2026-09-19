const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('C:', 'Users', 'sanjeet kumar', 'Desktop', 'Jmc_Export (4).xlsx');

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find rows containing "Nuts and Bolts"
  for(let i=0; i<rows.length; i++) {
     const row = rows[i];
     if (row[3] && typeof row[3] === 'string' && row[3].includes('Nuts and Bolts')) {
         console.log(`Row ${i+1}: LOA ${row[1]}, TempCode ${row[2]}, Desc ${row[3]}`);
     }
  }
} catch (e) {
  console.error(e);
}
