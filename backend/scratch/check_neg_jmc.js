const mongoose = require('mongoose');
require('dotenv').config();

async function checkNeg() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const jmcs = await db.collection('jmcregisters').find({}).toArray();
    
    let negCount = 0;
    for (const jmc of jmcs) {
      if (!jmc.items) continue;
      for (const item of jmc.items) {
        if (item.claimedQty < 0 || item.approvedQty < 0 || item.quantity < 0) {
          console.log(`Negative JMC found in ${jmc.jmcNumber}: claimed=${item.claimedQty}, approved=${item.approvedQty}, qty=${item.quantity}`);
          negCount++;
        }
      }
    }
    console.log(`Total negative items found: ${negCount}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkNeg();
