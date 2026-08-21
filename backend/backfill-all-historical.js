const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const collections = ['jmcregisters', 'wipregisters', 'wiprequireds'];
  
  for (const collectionName of collections) {
    console.log(`\n--- Processing collection: ${collectionName} ---`);
    const docs = await mongoose.connection.collection(collectionName).find({}).toArray();
    console.log(`Found ${docs.length} documents.`);
    
    let updatedDocs = 0;
    
    for (const doc of docs) {
      if (!doc.items || doc.items.length === 0) continue;
      
      let modified = false;
      
      for (let i = 0; i < doc.items.length; i++) {
        const item = doc.items[i];
        
        // Match item master
        const matchedItem = await mongoose.connection.collection('items').findOne({
          "dynamicData.activity": item.activity,
          $or: [
            { "dynamicData.description": item.description },
            { "dynamicData.itemDescription": item.description },
            { "dynamicData.name": item.description }
          ]
        });
        
        if (matchedItem) {
          const dd = matchedItem.dynamicData || {};
          const loaSrNo = dd.loaSrNo || dd.loaSerialNo || dd.sku || '';
          const tempCode = dd.tempCode || '';
          const totalLoaQty = Number(dd.loaQty || dd.loaQuantity || dd.totalLoaQuantity || dd.qty || dd.quantity || 0);
          
          if (item.loaSrNo !== loaSrNo || item.tempCode !== tempCode || item.totalLoaQty !== totalLoaQty) {
            doc.items[i].loaSrNo = loaSrNo;
            doc.items[i].tempCode = tempCode;
            doc.items[i].totalLoaQty = totalLoaQty;
            modified = true;
          }
        }
      }
      
      if (modified) {
        await mongoose.connection.collection(collectionName).updateOne(
          { _id: doc._id },
          { $set: { items: doc.items } }
        );
        updatedDocs++;
      }
    }
    
    console.log(`Successfully updated ${updatedDocs} documents in ${collectionName}.`);
  }
  
  console.log("\nFinished backfilling all historical data.");
  process.exit(0);
}
run().catch(console.error);
