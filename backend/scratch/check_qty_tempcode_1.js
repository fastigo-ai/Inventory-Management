const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const tempCode = "1";

    // Check DI qty
    const dis = await db.collection('dis').find({ "lineItems.tempCode": tempCode }).toArray();
    let totalDiQty = 0;
    
    dis.forEach(di => {
      di.lineItems.forEach(item => {
        if (item.tempCode == tempCode) {
          totalDiQty += (item.quantity || 0);
        }
      });
    });

    // Check PI qty
    const pis = await db.collection('purchaseinvoices').find({ "lineItems.tempCode": tempCode }).toArray();
    let totalPiQty = 0;

    pis.forEach(pi => {
      pi.lineItems.forEach(item => {
        if (item.tempCode == tempCode) {
          totalPiQty += (item.quantity || 0);
        }
      });
    });

    console.log(`\n=== Quantity Check for Temp Code: ${tempCode} ===`);
    console.log(`Total DI Quantity: ${totalDiQty}`);
    console.log(`Total PI Quantity: ${totalPiQty}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
