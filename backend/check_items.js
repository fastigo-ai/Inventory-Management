require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const schema = new mongoose.Schema({}, { strict: false });
  const Item = mongoose.model('Item', schema, 'items');
  
  const items = await Item.find({
    'dynamicData.name': { $regex: /STP 9/i },
    'dynamicData.circle': { $regex: /nahan/i }
  }).lean();
  
  const deletedCount = items.filter(i => i.isDeleted).length;
  console.log('Total:', items.length);
  console.log('Deleted:', deletedCount);
  console.log('Not Deleted:', items.length - deletedCount);
  
  process.exit(0);
}

check();
