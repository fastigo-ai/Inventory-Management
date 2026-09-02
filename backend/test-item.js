const mongoose = require('mongoose');
require('dotenv').config();

const itemSchema = new mongoose.Schema({}, { strict: false });
const Item = mongoose.model('Item', itemSchema, 'items');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const item = await Item.findOne({ 'dynamicData.tempCode': { $exists: true } }).lean();
  console.log(JSON.stringify(item?.dynamicData, null, 2));
  process.exit(0);
}
run().catch(console.error);
