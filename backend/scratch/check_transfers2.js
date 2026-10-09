const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const StoreTransfer = mongoose.connection.collection('storetransfers');
  
  const fromSolan = await StoreTransfer.countDocuments({ fromStore: /Solan|Kumarhatti|Nalagarh/i, registerType: 'OUTWARD', status: { $nin: ['Cancelled', 'REJECTED', 'CANCELLED'] } });
  const toSolan = await StoreTransfer.countDocuments({ toStore: /Solan|Kumarhatti|Nalagarh/i, status: { $in: ['RECEIVED', 'IN_TRANSIT'] } });
  const anyTransfers = await StoreTransfer.countDocuments();
  
  console.log(`Outward Transfers from Solan Circle Stores: ${fromSolan}`);
  console.log(`Inward Transfers to Solan Circle Stores: ${toSolan}`);
  console.log(`Total Transfers in DB: ${anyTransfers}`);
  
  process.exit(0);
}
main().catch(console.error);
