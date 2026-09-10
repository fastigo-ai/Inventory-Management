const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('C:\\Users\\sanjeet kumar\\Desktop\\GYAN CHAND JMC DONE.xlsx');
  
  console.log("Total Sheets:", workbook.SheetNames.length);
  const sheetName = workbook.SheetNames[0]; 
  const sheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`\n--- First 20 rows of sheet '${sheetName}' ---`);
  for(let i = 0; i < Math.min(20, data.length); i++) {
    // Filter out completely empty rows for readability
    if (data[i] && data[i].length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(data[i]));
    }
  }
} catch (e) {
  console.error("Error reading file:", e.message);
}
