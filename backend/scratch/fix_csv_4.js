require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

async function fixCSVByLoaAndCircle() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  // Use the original file name the user is targeting
  const csvPath = 'C:\\Users\\sanjeet kumar\\Downloads\\DI data for solan and nahan.csv';
  
  if (!fs.existsSync(csvPath)) {
     console.error(`File not found: ${csvPath}`);
     process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });
  
  const itemsColl = db.collection('items');
  const dbItems = await itemsColl.find({ isDeleted: false }).toArray();
  
  const itemMap = new Map();
  dbItems.forEach(item => {
    const data = item.dynamicData || {};
    const circle = (data.circle || '').trim().toLowerCase();
    const loaSrNo = (data.loaSrNo || data.loaSerialNo || data.loaSerialNumber || data.sku || '').toString().trim().toLowerCase();
    
    if (circle && loaSrNo) {
      const key = `${circle}_${loaSrNo}`;
      itemMap.set(key, {
        unit: data.unit || 'Nos',
        name: data.name || ''
      });
    }
  });

  console.log(`Loaded ${itemMap.size} unique (circle + loa) items from DB`);
  
  let updatedCount = 0;
  
  records.forEach((row) => {
    let circleCol = 'Circle';
    let unitCol = 'Unit';
    let loaCol = 'LoaSerialNo';
    
    if (row[circleCol] && row[loaCol]) {
      const csvCircle = row[circleCol].trim().toLowerCase();
      const csvLoa = row[loaCol].toString().trim().toLowerCase();
      
      const key = `${csvCircle}_${csvLoa}`;
      const dbItemInfo = itemMap.get(key);
      
      if (dbItemInfo) {
        if (row[unitCol] && row[unitCol] !== dbItemInfo.unit) {
          row[unitCol] = dbItemInfo.unit;
          updatedCount++;
        }
      }
    }
  });

  const outputCsv = stringify(records, { header: true });
  // Write to a brand new file to avoid EBUSY if user still has it open in Excel
  const outputPath = 'C:\\Users\\sanjeet kumar\\Downloads\\DI data for solan and nahan_UNIT_FIXED.csv';
  fs.writeFileSync(outputPath, outputCsv);
  
  console.log(`Saved fixed CSV to ${outputPath}`);
  console.log(`Made ${updatedCount} unit corrections based on Circle + LOA Sr No.`);
  
  mongoose.disconnect();
}

fixCSVByLoaAndCircle().catch(console.error);
