const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_db';
const Item = mongoose.models.Item || mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

async function check() {
  await mongoose.connect(MONGO_URI);
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  const newItems = await Item.find({ createdAt: { $gte: thirtyMinsAgo } }).lean();
  console.log('New items created recently:', newItems.length);
  if (newItems.length > 0) {
     console.log('Sample newly created items:');
     newItems.slice(0, 5).forEach(i => console.log(i.dynamicData.name, '| SKU (LOA):', i.dynamicData.sku, '| Pkg:', i.dynamicData.package, '| Circle:', i.dynamicData.circle));
  }
  process.exit(0);
}
check();
