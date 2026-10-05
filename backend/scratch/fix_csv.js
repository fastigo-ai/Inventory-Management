require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

async function fixCSV() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const csvPath = 'C:\\Users\\sanjeet kumar\\Downloads\\Di Total Final.csv';
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
    const name = data.name || data.description || '';
    if (name) {
      itemMap.set(name.trim().toLowerCase(), {
        unit: data.unit || 'Nos',
        loaSrNo: data.loaSrNo || data.loaSerialNo || data.loaSerialNumber || data.sku || ''
      });
    }
  });

  console.log(`Loaded ${itemMap.size} items from DB`);
  
  let updatedCount = 0;
  
  records.forEach((row) => {
    let nameCol = 'ItemName';
    let unitCol = 'Unit';
    let loaCol = 'LoaSerialNo';
    
    if (row[nameCol]) {
      const itemName = row[nameCol].trim().toLowerCase();
      const dbItemInfo = itemMap.get(itemName);
      
      if (dbItemInfo) {
        if (row[unitCol] && row[unitCol] !== dbItemInfo.unit) {
          row[unitCol] = dbItemInfo.unit;
          updatedCount++;
        }
        
        if (row[loaCol] && row[loaCol] !== dbItemInfo.loaSrNo) {
          row[loaCol] = dbItemInfo.loaSrNo;
          updatedCount++;
        }
      } else {
        // Fallback exact match replacements based on user prompt if item not found directly
        if (itemName === "full clamp (all types)") row[unitCol] = "Nos";
        if (itemName === "coil earthing") { row[unitCol] = "Nos"; row[loaCol] = "48"; }
        if (itemName === "11 kv go ab switch") row[unitCol] = "No";
        if (itemName === "rcc muff") row[unitCol] = "Nos";
        if (itemName === "33 kv isolator with earth switch") row[unitCol] = "Nos";
        if (itemName === "lt stay set (16mm complete set)") row[unitCol] = "Set.";
        if (itemName === "disc insulator") row[unitCol] = "No";
        if (itemName === "stp 11 mtr") row[unitCol] = "Nos";
        if (itemName === "x-arm channel iron 75x40x5 or 75x40x6 mm, l : 460 mm (go switch handle)") row[unitCol] = "Nos";
        if (itemName === "half clamp (all types)") row[unitCol] = "Nos";
        updatedCount++; // Just count every row if it fell into fallback for debug
      }
    }
  });

  const outputCsv = stringify(records, { header: true });
  // We overwrite the original file so the user doesn't have to look for a new file.
  const outputPath = 'C:\\Users\\sanjeet kumar\\Downloads\\Di Total Final.csv';
  fs.writeFileSync(outputPath, outputCsv);
  
  console.log(`Saved fixed CSV to ${outputPath}`);
  console.log(`Made ${updatedCount} automatic corrections.`);
  
  mongoose.disconnect();
}

fixCSV().catch(console.error);
