const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    // Aggregate all DIs
    const dis = await db.collection('dis').find({}).toArray();
    
    const circleTotals = {};
    let totalOverall = 0;
    
    dis.forEach(di => {
      if (di.lineItems) {
        di.lineItems.forEach(li => {
          const circle = String(li.circle || 'UNKNOWN').trim();
          const qty = Number(li.allocatedQty || li.quantity || 0);
          
          if (!circleTotals[circle]) circleTotals[circle] = 0;
          circleTotals[circle] += qty;
          totalOverall += qty;
        });
      }
    });
    
    // Sort circles by name
    const sortedCircles = Object.keys(circleTotals).sort();
    
    console.log(`--- TOTAL DI QUANTITY BY CIRCLE (ALL ITEMS) ---`);
    for (const circle of sortedCircles) {
      console.log(`- ${circle}: ${circleTotals[circle].toLocaleString('en-IN')}`);
    }
    console.log(`\nTOTAL ACROSS ALL CIRCLES: ${totalOverall.toLocaleString('en-IN')}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
