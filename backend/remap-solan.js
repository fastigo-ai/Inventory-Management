const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.MONGO_URI;

async function mapInsertedItems() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');
    const db = mongoose.connection.db;

    // 1. Load all new Solan items into a map
    const newSolanItems = await db.collection('items').find({
      'dynamicData.circle': { $regex: /solan/i }
    }).toArray();
    
    console.log(`Found ${newSolanItems.length} newly inserted Solan items.`);

    // Map by LOA Serial No
    const itemMap = new Map();
    for (const item of newSolanItems) {
      const loa = item.dynamicData?.loaSerialNo;
      if (loa) {
        itemMap.set(String(loa).trim().toLowerCase(), item._id);
      }
    }

    // Collections to check
    const collections = [
      { name: 'dis', arrayField: 'lineItems', itemField: 'itemId', matchField: 'loaSerialNo' },
      { name: 'storeinwardentries', isFlat: true, itemField: 'itemId', matchField: 'loaSerialNo' }, // Note: Inwards usually have array lineItems, wait, let me check.
      { name: 'contractorassignments', arrayField: 'lineItems', itemField: 'itemId', matchField: 'loaSerialNo' },
      { name: 'mhrovs', arrayField: 'lineItems', itemField: 'itemId', matchField: 'loaSerialNo' },
      { name: 'purchaseorders', arrayField: 'lineItems', itemField: 'itemId', matchField: 'loaSerialNo' },
      { name: 'purchaseinvoices', arrayField: 'lineItems', itemField: 'itemId', matchField: 'loaSerialNo' },
      { name: 'jmcregisters', arrayField: 'lineItems', itemField: 'itemId', matchField: 'loaSerialNo' }
    ];
    
    // Check schemas dynamically
    for (const collInfo of collections) {
      console.log(`\n--- Processing collection: ${collInfo.name} ---`);
      
      let cursor;
      try {
        cursor = await db.collection(collInfo.name).find({}).toArray();
      } catch (e) {
        console.log(`Collection ${collInfo.name} not found or empty.`);
        continue;
      }
      
      let updatedCount = 0;

      for (const doc of cursor) {
        let isUpdated = false;
        
        // Handle flat collections vs array collections
        if (collInfo.isFlat) {
          // If the document itself has itemId
          // Check if circle is Solan
          const circle = (doc.circle || '').toLowerCase();
          if (circle.includes('solan') && doc.loaSerialNo) {
             const newId = itemMap.get(String(doc.loaSerialNo).trim().toLowerCase());
             if (newId && String(doc.itemId) !== String(newId)) {
               doc.itemId = newId;
               isUpdated = true;
             }
          }
        } else if (doc[collInfo.arrayField]) {
          // Handle arrays like lineItems
          for (const line of doc[collInfo.arrayField]) {
             const circle = (line.circle || doc.circle || '').toLowerCase();
             
             // The LOA might be stored as loaSerialNo, loaSrNo, or sku
             const loa = line.loaSerialNo || line.loaSrNo || line.sku;
             
             if (circle.includes('solan') && loa) {
                const newId = itemMap.get(String(loa).trim().toLowerCase());
                if (newId && String(line[collInfo.itemField]) !== String(newId)) {
                  line[collInfo.itemField] = newId;
                  isUpdated = true;
                }
             }
          }
        }
        
        if (isUpdated) {
           await db.collection(collInfo.name).updateOne(
             { _id: doc._id },
             { $set: collInfo.isFlat ? { itemId: doc.itemId } : { [collInfo.arrayField]: doc[collInfo.arrayField] } }
           );
           updatedCount++;
        }
      }
      
      console.log(`Updated ${updatedCount} documents in ${collInfo.name}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

mapInsertedItems();
