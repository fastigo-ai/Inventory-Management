const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const StoreTransfer = mongoose.connection.collection('storetransfers');
  
  const fromNalagarh = await StoreTransfer.countDocuments({ fromStore: /Nalagarh/i, registerType: 'OUTWARD', status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } });
  const toNalagarh = await StoreTransfer.countDocuments({ toStore: /Nalagarh/i, status: { $in: ['RECEIVED', 'IN_TRANSIT'] } });
  
  console.log(`Outward Transfers from Nalagarh: ${fromNalagarh}`);
  console.log(`Inward Transfers to Nalagarh: ${toNalagarh}`);
  
  process.exit(0);
}
main().catch(console.error);
