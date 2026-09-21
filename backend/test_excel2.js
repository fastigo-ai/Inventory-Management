const xlsx = require('xlsx');
const file = '/Users/Apple/Desktop/jmc portal (3).xlsx';
const workbook = xlsx.readFile(file);
const sheetName = 'JMC Sample Rohit';
if (workbook.Sheets[sheetName]) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log("Rows 1165-1172:");
    for(let i=1164; i<=1171; i++) {
        console.log(`Row ${i+1}:`, data[i]);
    }
}
