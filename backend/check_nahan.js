const xlsx = require('xlsx');

function checkNahan() {
    const workbook = xlsx.readFile('c:\\Users\\sanjeet kumar\\Desktop\\Jmc_Export.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    let nahanFound = 0;
    const circles = new Set();
    
    for (let r = 0; r < 20; r++) {
        const row = rows[r] || [];
        for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cell && String(cell).toLowerCase().includes('nahan')) {
                nahanFound++;
            }
            if (r === 0 && cell && String(cell).trim() !== '') {
                circles.add(String(cell).trim());
            }
        }
    }
    console.log(`Occurrences of 'nahan' in top 20 rows of Jmc_Export: ${nahanFound}`);
    console.log(`Unique values in Row 1 (Circle row):`, Array.from(circles).slice(0, 10));
}

checkNahan();
