const mongoose = require('mongoose');
require('dotenv').config();

const itemSchema = new mongoose.Schema({}, { strict: false });
const Item = mongoose.model('Item', itemSchema);

const mhrovSchema = new mongoose.Schema({
  status: String,
  items: [{ itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' } }]
}, { strict: false });
const Mhrov = mongoose.model('Mhrov', mhrovSchema, 'mhrovs');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const mhrov = await Mhrov.findOne({ status: 'Approved' }).populate('items.itemId').lean();
  console.log(JSON.stringify(mhrov?.items?.[0]?.itemId, null, 2));
  process.exit(0);
}
run().catch(console.error);
