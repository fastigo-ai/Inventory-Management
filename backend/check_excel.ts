import xlsx from 'xlsx';

try {
  const workbook = xlsx.readFile('C:\\Users\\sanjeet kumar\\Desktop\\jmc nahan2.xlsx');
  console.log('Sheet names:', workbook.SheetNames);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });
  console.log('Rows count:', rows.length);

  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const cellA = rows[i][0];
    console.log(`Row ${i} Col A:`, JSON.stringify(cellA));
  }
} catch(e) {
  console.error(e);
}
