const mongoose = require('mongoose');
require('dotenv').config();

const StoreTransferSchema = new mongoose.Schema({
  registerType: String,
}, { strict: false });

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const StoreTransfer = mongoose.model('StoreTransfer', StoreTransferSchema, 'storetransfers');
  
  // Update all transfers where fromStore is Kumarhatti, toStore is Kumarhatti, or challanNo is Kumarhatti
  const res = await StoreTransfer.updateMany({
    $or: [{ fromStore: /Kumarhatti/i }, { toStore: /Kumarhatti/i }, { challanNo: /Kumarhatti/i }, { vendorName: '' }]
  }, { $set: { registerType: 'OUTWARD' } });
  
  console.log(`Updated ${res.modifiedCount} records to OUTWARD.`);
  
  const allTransfers = await StoreTransfer.find({ registerType: 'OUTWARD' });
  console.log(`OUTWARD transfers in DB: ${allTransfers.length}`);
  
  process.exit(0);
}

fix();
