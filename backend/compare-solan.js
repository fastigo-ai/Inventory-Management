const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.MONGO_URI;

const csvPath = 'c:\\Users\\sanjeet kumar\\Downloads\\Solan LOA_BOM 15.08.2026.csv';

async function compareItems() {
  const csvItems = [];
  let csvRowCount = 0;
  
  // 1. Read CSV using basic parsing
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split(/\r?\n/);
  
  if (lines.length > 0) {
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const loaIndex = headers.findIndex(h => {
       const hl = h.toLowerCase();
       return (hl.includes('loa') && (hl.includes('serial') || hl.includes('sr'))) || hl === 'sku';
    });
    const nameIndex = headers.findIndex(h => {
       const hl = h.toLowerCase();
       return hl.includes('name') || hl.includes('description') || hl.includes('item');
    });
    const tempCodeIndex = headers.findIndex(h => {
       const hl = h.toLowerCase();
       return hl.includes('temp') || hl.includes('code');
    });
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      let columns = [];
      let inQuotes = false;
      let current = '';
      for (let char of lines[i]) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          columns.push(current);
          current = '';
        } else current += char;
      }
      columns.push(current);
      
      const loa = (loaIndex !== -1 && columns[loaIndex]) ? columns[loaIndex].replace(/^"|"$/g, '').trim() : '';
      const name = (nameIndex !== -1 && columns[nameIndex]) ? columns[nameIndex].replace(/^"|"$/g, '').trim() : '';
      const tc = (tempCodeIndex !== -1 && columns[tempCodeIndex]) ? columns[tempCodeIndex].replace(/^"|"$/g, '').trim() : '';
      
      // If row has ANY of these, it's an item
      if (loa || name || tc) {
        csvRowCount++;
        csvItems.push({ loa, name, tc });
      }
    }
  }
  
  console.log(`Total valid item rows found in CSV: ${csvRowCount}`);
  console.log(`Items with valid LOA: ${csvItems.filter(i => i.loa).length}`);
  console.log(`Items missing LOA but have Name/TempCode: ${csvItems.filter(i => !i.loa).length}`);
  
  // 2. Query DB
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  
  const solanItems = await db.collection('items').find({ 
    'dynamicData.circle': { $regex: /solan/i } 
  }).toArray();
  
  console.log(`Total DB items for Solan: ${solanItems.length}`);
  
  // 3. Find exactly what is extra in the DB
  const dbLoas = new Map();
  
  for (const item of solanItems) {
    const loa = String(item.dynamicData?.loaSerialNo || item.dynamicData?.sku || '').trim();
    if (loa) {
      if (!dbLoas.has(loa)) dbLoas.set(loa, []);
      dbLoas.get(loa).push(item);
    }
  }
  
  const inDbNotInCsvIds = [];
  const inDbNotInCsvLoas = [];
  for (const [loa, items] of dbLoas.entries()) {
    if (!csvItems.find(c => c.loa === loa)) {
      inDbNotInCsvLoas.push(loa);
      items.forEach(i => inDbNotInCsvIds.push(i._id));
    }
  }
  
  // Find CSV items that are NOT in DB
  const csvItemsToInsert = [];
  for (const cItem of csvItems) {
    if (cItem.loa) {
       if (!dbLoas.has(cItem.loa)) {
         csvItemsToInsert.push(cItem);
       }
    } else {
       // It has no LOA. Let's see if it's already in DB by tempCode
       const found = solanItems.find(si => si.dynamicData?.tempCode === cItem.tc && (!si.dynamicData?.loaSerialNo || si.dynamicData?.loaSerialNo.trim() === ''));
       if (!found) {
         csvItemsToInsert.push(cItem);
       }
    }
  }
  
  console.log(`\nItems to Delete (Extra in DB): ${inDbNotInCsvIds.length}`);
  console.log(`Items to Insert (Missing in DB): ${csvItemsToInsert.length}`);
  
  // Execute Fix
  if (inDbNotInCsvIds.length > 0 || csvItemsToInsert.length > 0) {
     if (inDbNotInCsvIds.length > 0) {
       await db.collection('items').deleteMany({ _id: { $in: inDbNotInCsvIds } });
       console.log(`Deleted ${inDbNotInCsvIds.length} extra items.`);
     }
     
     if (csvItemsToInsert.length > 0) {
       const docs = csvItemsToInsert.map(c => ({
         dynamicData: {
           loaSerialNo: c.loa,
           tempCode: c.tc,
           itemName: c.name,
           circle: 'Solan',
           package: 'Package 1(S/N)',
           type: 'Goods'
         },
         isDeleted: false,
         history: []
       }));
       await db.collection('items').insertMany(docs);
       console.log(`Inserted ${docs.length} missing items.`);
     }
     
     const finalCount = await db.collection('items').countDocuments({ 'dynamicData.circle': { $regex: /solan/i } });
     console.log(`Final Solan Item Count in DB: ${finalCount}`);
  }

  await mongoose.disconnect();
}

compareItems();
