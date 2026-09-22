const mongoose = require('mongoose');
require('dotenv').config();

async function checkStock() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find Item with Temp Code 37
    const item = await db.collection('items').findOne({ tempCode: "37" });
    if (!item) {
      const item2 = await db.collection('items').findOne({ "dynamicData.tempCode": "37" });
      if (!item2) {
         console.log("Could not find item with temp code 37");
      } else {
         console.log("Found item in dynamicData:", item2.itemName || item2.description, item2._id);
         await checkSummary(db, item2._id);
      }
    } else {
      console.log("Found item:", item.itemName || item.description, item._id);
      await checkSummary(db, item._id);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

async function checkSummary(db, itemId) {
    const summaries = await db.collection('itemsummaries').find({ itemId: itemId }).toArray();
    console.log(`Found ${summaries.length} summaries for this item.`);
    summaries.forEach(s => {
        console.log(`Circle: ${s.circle}, ActQty: ${s.actQty}, iss: ${s.issuedQty}, return: ${s.returnedQty}`);
    });
}

checkStock();
