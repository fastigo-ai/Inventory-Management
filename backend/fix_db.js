const mongoose = require('mongoose');
require('dotenv').config();

const StoreTransferSchema = new mongoose.Schema({
  registerType: String,
  status: String,
  fromStore: String,
  toStore: String,
  minBookNo: String,
  minNo: String,
}, { strict: false });

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const StoreTransfer = mongoose.model('StoreTransfer', StoreTransferSchema, 'storetransfers');
  
  // Since outward register imported data typically has status: 'RECEIVED' (as per my previous fix)
  // Let's check how many there are without registerType
  const allTransfers = await StoreTransfer.find({});
  console.log(`Total transfers: ${allTransfers.length}`);
  
  // Outward register items might have no registerType (undefined) or INWARD default
  // Wait, let's see which ones have "Kumarhatti"
  const kumarhattiTransfers = await StoreTransfer.find({
    $or: [{ fromStore: /Kumarhatti/i }, { toStore: /Kumarhatti/i }, { challanNo: /Kumarhatti/i }]
  });
  console.log(`Transfers with Kumarhatti: ${kumarhattiTransfers.length}`);
  
  for (let t of kumarhattiTransfers) {
    t.registerType = 'OUTWARD';
    await t.save();
  }
  
  console.log('Fixed Kumarhatti transfers to OUTWARD.');
  process.exit(0);
}

fix();
