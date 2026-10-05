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
    const circleRegex = /nahan/i;

    // Check DI qty for Nahan and Temp Code 1
    const dis = await db.collection('dis').find({ 
      "lineItems": { $elemMatch: { tempCode: tempCode, circle: circleRegex } } 
    }).toArray();
    
    let totalDiQty = 0;
    dis.forEach(di => {
      di.lineItems.forEach(item => {
        if (item.tempCode == tempCode && item.circle && item.circle.match(circleRegex)) {
          totalDiQty += (item.quantity || 0);
        }
      });
    });

    // Check PI qty for Nahan and Temp Code 1
    const pis = await db.collection('purchaseinvoices').find({ 
      "lineItems": { $elemMatch: { tempCode: tempCode, circle: circleRegex } } 
    }).toArray();
    
    let totalPiQty = 0;
    pis.forEach(pi => {
      pi.lineItems.forEach(item => {
        if (item.tempCode == tempCode && item.circle && item.circle.match(circleRegex)) {
          totalPiQty += (item.quantity || 0);
        }
      });
    });

    console.log(`\n=== Quantity Check for Temp Code: 1 in NAHAN Circle ===`);
    console.log(`Total DI Quantity (Nahan): ${totalDiQty}`);
    console.log(`Total PI Quantity (Nahan): ${totalPiQty}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
