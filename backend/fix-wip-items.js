const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Fetch all items and create a map
  const items = await mongoose.connection.collection('items').find({}).toArray();
  const itemMap = {};
  for (const item of items) {
    itemMap[item._id.toString()] = item;
  }

  const collectionsToFix = ['wiprequiredregisters', 'wipregisters'];

  for (const colName of collectionsToFix) {
    console.log(`\nFixing collection: ${colName}`);
    const docs = await mongoose.connection.collection(colName).find({}).toArray();
    
    let updatedDocs = 0;

    for (const doc of docs) {
      if (!doc.items || !Array.isArray(doc.items)) continue;

      let changed = false;
      const newItems = doc.items.map(wipItem => {
        if (!wipItem.itemId) return wipItem;

        const itemRecord = itemMap[wipItem.itemId.toString()];
        if (!itemRecord) return wipItem;

        const dyn = itemRecord.dynamicData || {};
        
        const trueTempCode = dyn.tempCode || itemRecord.tempCode || wipItem.tempCode || '';
        const trueLoaSrNo = dyn.loaSrNo || dyn.loaSerialNo || dyn.sku || itemRecord.sku || wipItem.loaSrNo || '';
        const trueLoaQty = Number(dyn.loaQty || dyn.loaQuantity || dyn.totalLoaQuantity || dyn.qty || dyn.quantity || wipItem.totalLoaQty || 0);

        if (wipItem.tempCode !== trueTempCode || wipItem.loaSrNo !== trueLoaSrNo || wipItem.totalLoaQty !== trueLoaQty) {
          wipItem.tempCode = trueTempCode;
          wipItem.loaSrNo = trueLoaSrNo;
          wipItem.totalLoaQty = trueLoaQty;
          changed = true;
        }
        
        return wipItem;
      });

      if (changed) {
        await mongoose.connection.collection(colName).updateOne(
          { _id: doc._id },
          { $set: { items: newItems } }
        );
        updatedDocs++;
      }
    }
    console.log(`Updated ${updatedDocs} documents in ${colName}.`);
  }

  console.log("\nFinished fixing WIP items.");
  process.exit(0);
}

fix().catch(console.error);
