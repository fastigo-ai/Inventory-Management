import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }), 'items');

async function testResolution() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const allItems = await Item.find({}).lean() as any[];

  const itemsByTempCode = new Map<string, any[]>();
  const itemsByDescription = new Map<string, any[]>();
  
  for (const item of allItems) {
    const tempCode = String(item.dynamicData?.tempCode || item.rawItem?.tempCode || '').trim().toLowerCase();
    if (tempCode) {
      if (!itemsByTempCode.has(tempCode)) itemsByTempCode.set(tempCode, []);
      itemsByTempCode.get(tempCode)?.push(item);
    }
    const desc = String(item.dynamicData?.description || item.dynamicData?.name || '').trim().toLowerCase();
    if (desc) {
      if (!itemsByDescription.has(desc)) itemsByDescription.set(desc, []);
      itemsByDescription.get(desc)?.push(item);
    }
  }

  // Simulate Excel row
  const sr = {
      tempCode: '127',
      description: 'Nuts and Bolts of Various Sizes (Galvanised / Coated) [Preferably 16 mm ? or more  (with flat and spring washers)]'
  };
  const uc = 'solan';

  let matchedItemObj: any = null;

  // Exact TempCode Match
  if (!matchedItemObj && sr.tempCode) {
    const tempCode = String(sr.tempCode).trim().toLowerCase();
    if (tempCode) {
      const matches = itemsByTempCode.get(tempCode);
      if (matches && matches.length > 0) {
        const circleMatch = matches.find(i => {
          const itemCircle = String(i.dynamicData?.circle || '').toLowerCase();
          return itemCircle === uc || itemCircle.includes(uc) || uc.includes(itemCircle);
        });
        matchedItemObj = circleMatch || matches[0];
      }
    }
  }

  if (matchedItemObj) {
      console.log(`Matched by TempCode 127! Resolved LOA: ${matchedItemObj.dynamicData?.sku || matchedItemObj.dynamicData?.loaSrNo}`);
  }

  // Exact Description Match (Fallback)
  let descMatchedObj: any = null;
  if (sr.description) {
     const searchDesc = String(sr.description).trim().toLowerCase();
     if (searchDesc) {
       const matches = itemsByDescription.get(searchDesc);
       if (matches && matches.length > 0) {
         const circleMatch = matches.find(i => {
           const itemCircle = String(i.dynamicData?.circle || '').toLowerCase();
           return itemCircle === uc || itemCircle.includes(uc) || uc.includes(itemCircle);
         });
         descMatchedObj = circleMatch || matches[0];
       }
     }
  }

  if (descMatchedObj) {
      console.log(`Matched by Description! Resolved LOA: ${descMatchedObj.dynamicData?.sku || descMatchedObj.dynamicData?.loaSrNo}`);
  } else {
      console.log(`Failed to match by Description because of ? instead of Φ.`);
  }

  process.exit(0);
}

testResolution().catch(err => {
    console.error(err);
    process.exit(1);
});
