import xlsx from 'xlsx';
import path from 'path';

const investigateMeta = () => {
  const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

  let headerRowIdx = -1;
  for (let r = 0; r < 50; r++) {
    if (rows[r] && rows[r].some(c => String(c).toLowerCase().includes('loa'))) {
      headerRowIdx = r;
      break;
    }
  }

  const cols = [286, 288, 289, 290];
  
  for (const c of cols) {
    console.log(`\n--- Column ${c} ---`);
    for (let r = 0; r < headerRowIdx; r++) {
       const rowLabel = rows[r] ? String(rows[r][3] || '').trim() : ''; // Col D has the label?
       const val = rows[r] ? String(rows[r][c] || '').trim() : '';
       if (val) {
          console.log(`Row ${r}: ${val}`);
       }
    }
  }
};

investigateMeta();
