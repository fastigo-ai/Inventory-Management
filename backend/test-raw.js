const mongoose = require('mongoose');
require('dotenv').config();

const mhrovSchema = new mongoose.Schema({}, { strict: false });
const Mhrov = mongoose.model('Mhrov', mhrovSchema, 'mhrovs');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const mhrovs = await Mhrov.find({ status: 'Approved' }).lean();
  const mhrovWithItems = mhrovs.find(m => m.items && m.items.length > 0);
  console.log(JSON.stringify(mhrovWithItems?.items, null, 2));
  process.exit(0);
}
run().catch(console.error);
