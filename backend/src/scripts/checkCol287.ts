import xlsx from 'xlsx';
import path from 'path';

const checkCol287 = () => {
  const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

  console.log('--- Column 286 ---');
  for (let r = 0; r < 8; r++) console.log(`Row ${r}: ${rows[r][286]}`);
  
  console.log('\n--- Column 287 ---');
  for (let r = 0; r < 8; r++) console.log(`Row ${r}: ${rows[r][287]}`);

  console.log('\n--- Column 288 ---');
  for (let r = 0; r < 8; r++) console.log(`Row ${r}: ${rows[r][288]}`);
};

checkCol287();
