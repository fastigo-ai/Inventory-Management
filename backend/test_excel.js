const xlsx = require('xlsx');
const file = '/Users/Apple/Desktop/jmc portal (3).xlsx';
const workbook = xlsx.readFile(file);
const sheetName = 'JMC Sample Rohit';
if (workbook.Sheets[sheetName]) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log("Row 1171 (index 1170):", data[1170]);
    console.log("Row 1172 (index 1171):", data[1171]);
} else {
    console.log("Sheet not found:", sheetName);
}
