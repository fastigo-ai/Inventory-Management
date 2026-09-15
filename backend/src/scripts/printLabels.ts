import xlsx from 'xlsx';
import path from 'path';

const printLabels = () => {
  const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

  for (let r = 0; r < 8; r++) {
      let label = "";
      for (let c = 0; c < 5; c++) {
          if (rows[r] && rows[r][c]) {
              label += rows[r][c] + " | ";
          }
      }
      console.log(`Row ${r} labels: ${label}`);
  }
};

printLabels();
