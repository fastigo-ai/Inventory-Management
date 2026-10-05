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

    const summary = {};

    // Helper to get consistent circle names
    const normalizeCircle = (circleName) => {
      if (!circleName) return 'Unknown';
      return circleName.trim().toUpperCase();
    };

    // Calculate DI Qty
    const dis = await db.collection('dis').find({ "lineItems.tempCode": tempCode }).toArray();
    dis.forEach(di => {
      di.lineItems.forEach(item => {
        if (item.tempCode == tempCode) {
          const circle = normalizeCircle(item.circle);
          if (!summary[circle]) summary[circle] = { DI: 0, PI: 0 };
          summary[circle].DI += (item.quantity || 0);
        }
      });
    });

    // Calculate PI Qty
    const pis = await db.collection('purchaseinvoices').find({ "lineItems.tempCode": tempCode }).toArray();
    pis.forEach(pi => {
      pi.lineItems.forEach(item => {
        if (item.tempCode == tempCode) {
          const circle = normalizeCircle(item.circle);
          if (!summary[circle]) summary[circle] = { DI: 0, PI: 0 };
          summary[circle].PI += (item.quantity || 0);
        }
      });
    });

    console.log(`\n=== Circle-Wise Quantity for Temp Code 1 ===\n`);
    for (const [circle, data] of Object.entries(summary)) {
      console.log(`Circle: ${circle.padEnd(10, ' ')} | DI Qty: ${String(data.DI).padEnd(8, ' ')} | PI Qty: ${data.PI}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
