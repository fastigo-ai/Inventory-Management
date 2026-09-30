const mongoose = require('mongoose');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_db';
const Item = mongoose.models.Item || mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

function normalize(s) {
    if (s === undefined || s === null) return '';
    return s.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function check() {
  await mongoose.connect(MONGO_URI);
  const dbItems = await Item.find().lean();
  
  // Create a structured list of normalized DB items for fast matching
  const dbRecords = dbItems.map(i => {
      const d = i.dynamicData || {};
      return {
          name: normalize(d.name),
          description: normalize(d.description),
          tempCode: normalize(d.tempCode),
          loaSerialNo: normalize(d.loaSerialNo),
          activity: normalize(d.activity),
          originalName: d.name || 'Unknown'
      };
  });

  const filePath = 'C:\\Users\\sanjeet kumar\\Desktop\\New Microsoft Excel Worksheetboq.csv';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // CSV column indices
  // 0: Name, 2: LOA Serial No., 3: Description, 6: Activity, 7: TEMP CODE
  
  const mismatchRows = [];
  
  for (let i = 1; i < data.length; i++) {
      if (!data[i] || !data[i][0]) continue; // skip empty rows
      
      const csvName = normalize(data[i][0]);
      const csvLoa = normalize(data[i][2]);
      const csvDesc = normalize(data[i][3]);
      const csvActivity = normalize(data[i][6]);
      const csvTempCode = normalize(data[i][7]);
      
      // Look for a DB record that matches ALL these criteria
      const exactMatch = dbRecords.find(db => 
          (db.name === csvName || db.description === csvName) && // Name in CSV sometimes matches DB description
          db.tempCode === csvTempCode &&
          db.loaSerialNo === csvLoa &&
          db.activity === csvActivity
      );
      
      if (!exactMatch) {
          // It didn't match all. Let's see what it partially matched to give better feedback
          const partialMatch = dbRecords.find(db => db.name === csvName || db.description === csvDesc || db.description === csvName);
          mismatchRows.push({
              rowNum: i + 1,
              csv: {
                  name: data[i][0],
                  description: data[i][3],
                  tempCode: data[i][7],
                  loaSerialNo: data[i][2],
                  activity: data[i][6]
              },
              dbFound: partialMatch ? {
                  name: partialMatch.originalName,
                  tempCode: partialMatch.tempCode,
                  loaSerialNo: partialMatch.loaSerialNo,
                  activity: partialMatch.activity
              } : 'No partial match found'
          });
      }
  }
  
  console.log('Total DB items checked:', dbRecords.length);
  console.log('Total CSV rows checked:', data.length - 1);
  console.log('Mismatched or Missing Items:', mismatchRows.length);
  console.log('---------------------');
  if (mismatchRows.length > 0) {
      console.log('Sample of 5 Mismatched Items:');
      console.log(JSON.stringify(mismatchRows.slice(0, 5), null, 2));
  }
  
  process.exit(0);
}
check();
