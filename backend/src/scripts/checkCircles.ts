import xlsx from 'xlsx';
import path from 'path';

const checkCircles = () => {
  const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

  const circles: Record<string, number> = {};

  for (let c = 5; c < 415; c++) {
      let circleVal = rows[0][c];
      if (!circleVal || circleVal === '') {
         // look left
         for (let left = c - 1; left >= 5; left--) {
             if (rows[0][left]) {
                 circleVal = rows[0][left];
                 break;
             }
         }
      }
      if (circleVal) {
          const lower = String(circleVal).trim().toLowerCase();
          circles[lower] = (circles[lower] || 0) + 1;
      }
  }

  console.log(circles);
};

checkCircles();
