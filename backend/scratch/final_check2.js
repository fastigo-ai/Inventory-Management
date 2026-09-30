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
          if (i.dynamicData.tempCode) dbStrings.add(normalize(i.dynamicData.tempCode));
      }
  });

  const filePath = 'C:\\Users\\sanjeet kumar\\Desktop\\New Microsoft Excel Worksheetboq.csv';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const excelItems = [];
  // Checking column 0 (Name), 3 (Description), 7 (TEMP CODE)
  for (let i = 1; i < data.length; i++) {
      if (!data[i]) continue;
      const name = data[i][0];
      const desc = data[i][3];
      const tempCode = data[i][7];
      
      let matched = false;
      if (name && dbStrings.has(normalize(name))) matched = true;
      if (desc && dbStrings.has(normalize(desc))) matched = true;
      if (tempCode && dbStrings.has(normalize(tempCode))) matched = true;
      
      if (!matched && (name || desc)) {
          excelItems.push(name || desc);
      }
  }
  
  const uniqueMissing = [...new Set(excelItems)];
  console.log('Total DB strings indexed:', dbStrings.size);
  console.log('Missing items count:', uniqueMissing.length);
  console.log('---------------------');
  uniqueMissing.forEach(m => console.log(m));
  process.exit(0);
}
check();
