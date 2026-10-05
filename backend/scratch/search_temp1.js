const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    const piTemp1 = await db.collection('purchaseinvoices').find({ 
      $or: [
        { invoiceNumber: /TEMP1/i },
        { "lineItems.itemName": /TEMP1/i },
        { poNumber: /TEMP1/i }
      ]
    }).toArray();
    
    console.log("Found PIs with TEMP1 in fields:", piTemp1.length);
    if(piTemp1.length > 0) {
      console.log("Sample PI:", JSON.stringify(piTemp1[0], null, 2));
    }
    
    const irTemp1 = await db.collection('storeinwardentries').find({ 
      $or: [
        { invoiceNumber: /TEMP1/i },
        { itemName: /TEMP1/i },
        { tempCode: /TEMP1/i },
        { challanNumber: /TEMP1/i },
        { inwardId: /TEMP1/i }
      ]
    }).toArray();
    
    console.log("Found IRs with TEMP1 in fields:", irTemp1.length);
    if(irTemp1.length > 0) {
      console.log("Sample IR:", JSON.stringify(irTemp1[0], null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
