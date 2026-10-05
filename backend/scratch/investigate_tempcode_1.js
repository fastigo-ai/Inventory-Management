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

    const dis = await db.collection('dis').find({ "lineItems.tempCode": tempCode }).toArray();
    let diDetails = [];
    dis.forEach(di => {
      di.lineItems.forEach(item => {
        if (item.tempCode == tempCode) {
          diDetails.push(`DI: ${di.diNumber} | Qty: ${item.quantity} | Circle: ${item.circle || 'N/A'}`);
        }
      });
    });

    const pis = await db.collection('purchaseinvoices').find({ "lineItems.tempCode": tempCode }).toArray();
    let piDetails = [];
    pis.forEach(pi => {
      pi.lineItems.forEach(item => {
        if (item.tempCode == tempCode) {
          piDetails.push(`PI: ${pi.invoiceNumber} | Qty: ${item.quantity} | Circle: ${item.circle || 'N/A'} | PO: ${pi.poNumber}`);
        }
      });
    });

    console.log(`\n=== DIs for Temp Code 1 ===`);
    console.log(diDetails.join('\n'));
    console.log(`\n=== PIs for Temp Code 1 ===`);
    console.log(piDetails.join('\n'));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
