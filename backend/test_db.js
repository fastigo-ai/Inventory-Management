const mongoose = require('mongoose');
require('dotenv').config();

const StoreTransferSchema = new mongoose.Schema({
  registerType: String,
  status: String,
  fromStore: String,
  toStore: String,
}, { strict: false });

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const StoreTransfer = mongoose.model('StoreTransfer', StoreTransferSchema, 'storetransfers');
  
  const allTransfers = await StoreTransfer.find({ registerType: 'OUTWARD' });
  console.log(`OUTWARD transfers: ${allTransfers.length}`);
  
  const inwardTransfers = await StoreTransfer.find({ registerType: 'INWARD' });
  console.log(`INWARD transfers: ${inwardTransfers.length}`);
  
  process.exit(0);
}

fix();
