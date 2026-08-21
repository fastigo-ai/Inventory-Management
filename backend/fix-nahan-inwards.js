const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  console.log("=== STARTING AUTOMATED MIGRATION ===");
  let updatedCount = 0;

  // 1. Process PIs
  const pis = await mongoose.connection.collection('purchaseinvoices').find({ 'lineItems.circle': { $regex: new RegExp(`^Nahan$`, 'i') } }).toArray();
  
  for (const pi of pis) {
    for (const item of pi.lineItems) {
      if (item.circle && item.circle.toLowerCase() === 'nahan') {
        // Find any inwards linked to this PI that are NOT in Nahan
        const wrongInwards = await mongoose.connection.collection('storeinwardentries').find({
          purchaseInvoiceId: pi._id,
          itemName: item.itemName,
          circle: { $not: { $regex: new RegExp(`^Nahan$`, 'i') } }
        }).toArray();
        
        for (const inward of wrongInwards) {
          await mongoose.connection.collection('storeinwardentries').updateOne(
            { _id: inward._id },
            { $set: { circle: 'Nahan' } }
          );
          updatedCount++;
        }
      }
    }
  }
  
  // 2. Process DIs
  const dis = await mongoose.connection.collection('dis').find({ 'lineItems.circle': { $regex: new RegExp(`^Nahan$`, 'i') } }).toArray();
  const diTopLevel = await mongoose.connection.collection('dis').find({ circle: { $regex: new RegExp(`^Nahan$`, 'i') } }).toArray();
  
  const allNahanDis = [...dis, ...diTopLevel];
  const uniqueDis = new Map();
  allNahanDis.forEach(di => uniqueDis.set(di._id.toString(), di));
  
  for (const di of uniqueDis.values()) {
    let itemsToCheck = [];
    if (di.circle && di.circle.toLowerCase() === 'nahan') {
      itemsToCheck = di.lineItems;
    } else {
      itemsToCheck = di.lineItems.filter(i => i.circle && i.circle.toLowerCase() === 'nahan');
    }
    
    for (const item of itemsToCheck) {
      const wrongInwards = await mongoose.connection.collection('storeinwardentries').find({
        $or: [
          { diId: di._id },
          { diRefNo: di.diNumber }
        ],
        tempCode: item.tempCode,
        circle: { $not: { $regex: new RegExp(`^Nahan$`, 'i') } }
      }).toArray();
      
      for (const inward of wrongInwards) {
        await mongoose.connection.collection('storeinwardentries').updateOne(
          { _id: inward._id },
          { $set: { circle: 'Nahan' } }
        );
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ MIGRATION COMPLETE! Successfully moved ${updatedCount} corrupted inwards to the Nahan circle.`);
  process.exit(0);
}
run().catch(console.error);
