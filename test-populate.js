const mongoose = require('mongoose');
require('dotenv').config();
const { Mhrov } = require('./backend/src/modules/store/mhrov.schema');
// need to require Item model so mongoose knows it
require('./backend/src/modules/items/item.model');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const mhrov = await Mhrov.findOne({ status: 'Approved' })
    .populate('items.itemId')
    .lean();
  console.log(JSON.stringify(mhrov?.items?.[0]?.itemId, null, 2));
  process.exit(0);
}
run().catch(console.error);
