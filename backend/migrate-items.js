const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI;

async function migrateItems() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to remote DB');

    const db = mongoose.connection.db;
    
    // Find all items that are missing loaSerialNo but have sku
    const badItems = await db.collection('items').find({
      'dynamicData.sku': { $exists: true },
      'dynamicData.loaSerialNo': { $exists: false }
    }).toArray();
    
    console.log(`Found ${badItems.length} items to migrate.`);
    
    let updated = 0;
    for (const item of badItems) {
      const dd = item.dynamicData;
      
      // Map old fields to new fields
      if (!dd.loaSerialNo && dd.sku) {
        dd.loaSerialNo = dd.sku;
      }
      if (!dd.itemName && dd.name) {
        dd.itemName = dd.name;
      }
      
      // Fix loaQuantity naming 
      if (dd.loaQuantity !== undefined && dd.loaQty === undefined) {
        dd.loaQty = dd.loaQuantity;
      }
      
      await db.collection('items').updateOne(
        { _id: item._id },
        { $set: { dynamicData: dd } }
      );
      
      updated++;
      if (updated % 100 === 0) {
        console.log(`Migrated ${updated} items...`);
      }
    }
    
    console.log(`Successfully migrated ${updated} items.`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

migrateItems();
