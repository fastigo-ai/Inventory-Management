import xlsx from 'xlsx';
import path from 'path';

const checkUnique = () => {
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

  const metaRows: Record<number, string> = {};
  for (let r = 0; r < headerRowIdx; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < 5; c++) {
      const cell = String(row[c] || '').toLowerCase();
      if (cell.includes('sub') && cell.includes('station')) metaRows[r] = 'SubStation';
      else if (cell.includes('feeder')) metaRows[r] = 'Feeder';
      else if (cell.includes('location')) metaRows[r] = 'Location';
      else if (cell.includes('division') && !cell.includes('sub')) metaRows[r] = 'Division';
      else if (cell.includes('sub') && cell.includes('division')) metaRows[r] = 'SubDivision';
      else if (cell.includes('circle') && !cell.includes('sub')) metaRows[r] = 'Circle';
      else if (cell.includes('contractor')) metaRows[r] = 'Contractor';
      else if (cell.includes('drawing')) metaRows[r] = 'DrawingNo';
    }
  }

  const uniqueCombos = new Set();
  let colCount = 0;
  for (let c = 5; c < rows[headerRowIdx].length; c++) {
    if (!rows[headerRowIdx][c]) continue;
    
    const meta: any = {};
    for (const [rIdx, field] of Object.entries(metaRows)) {
      meta[field] = rows[Number(rIdx)][c] || '';
    }
    
    // Fallback logic
    for (const [rIdx, field] of Object.entries(metaRows)) {
      if (!meta[field]) {
        for (let left = c - 1; left >= 5; left--) {
           if (rows[Number(rIdx)][left]) {
               meta[field] = rows[Number(rIdx)][left];
               break;
           }
        }
      }
    }

    const key = `${meta.Contractor}|${meta.DrawingNo}|${meta.Location}|${meta.Circle}|${meta.Division}|${meta.SubDivision}|${meta.SubStation}|${meta.Feeder}`;
    uniqueCombos.add(key);
    colCount++;
  }

  console.log(`Total valid columns: ${colCount}`);
  console.log(`Total unique metadata combinations: ${uniqueCombos.size}`);
};

checkUnique();
