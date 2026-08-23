const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI;

async function investigateSolanItems() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to remote DB');

    const db = mongoose.connection.db;
    
    const allItems = await db.collection('items').find({}).toArray();
    
    let badItems = 0;
    let goodItems = 0;
    
    for (const item of allItems) {
      if (item.dynamicData?.loaSerialNo) {
        goodItems++;
      } else if (item.dynamicData?.sku) {
        badItems++;
      }
    }
    
    console.log(`Total items in DB: ${allItems.length}`);
    console.log(`Good items (has loaSerialNo): ${goodItems}`);
    console.log(`Bad items (has sku but no loaSerialNo): ${badItems}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

investigateSolanItems();
