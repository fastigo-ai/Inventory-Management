const mongoose = require('mongoose');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_db';
const Item = mongoose.models.Item || mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

function normalize(s) {
    if (!s) return '';
    return s.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function check() {
  await mongoose.connect(MONGO_URI);
  const dbItems = await Item.find().lean();
  
  const dbStrings = new Set();
  dbItems.forEach(i => {
      if (i.dynamicData) {
          if (i.dynamicData.name) dbStrings.add(normalize(i.dynamicData.name));
          if (i.dynamicData.description) dbStrings.add(normalize(i.dynamicData.description));
      }
  });

  const filePath = 'C:\\Users\\sanjeet kumar\\Desktop\\New Microsoft Excel Worksheet.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const headers = data[0] || [];
  console.log("Headers:", headers);

  let nameColIdx = headers.findIndex(h => {
      if (!h) return false;
      const lower = h.toString().toLowerCase();
      return lower.includes('name') || lower.includes('description') || lower.includes('item') || lower.includes('material');
  });

  if (nameColIdx === -1) {
      nameColIdx = 0; // fallback
  }

  console.log("Using column index:", nameColIdx, "Header:", headers[nameColIdx]);

  const excelItems = [];
  for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][nameColIdx]) {
          excelItems.push(String(data[i][nameColIdx]).trim());
      }
  }
  
  const unique = [...new Set(excelItems)];
  const missing = [];
  
  for (const itemName of unique) {
      if (!itemName || itemName.length < 2) continue;
      const norm = normalize(itemName);
      if (!dbStrings.has(norm)) {
          missing.push(itemName);
      }
  }
  
  console.log('Total DB strings indexed:', dbStrings.size);
  console.log('Total Unique in Excel:', unique.length);
  console.log('Missing items count:', missing.length);
  console.log('---------------------');
  missing.forEach(m => console.log(m));
  process.exit(0);
}
check();
