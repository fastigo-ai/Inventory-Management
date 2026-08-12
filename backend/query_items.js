require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./src/modules/items/item.model').default || require('./src/modules/items/item.model');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const search1 = "Distribution Transformer (Ordinary), 11/0.4 kV, 250 KVA";
  const search2 = "Distribution Transformer (Ordinary), 11/0.4 kV, 100 KVA";
  const search3 = "LT Cable";

  const res1 = await Item.find({ description: { $regex: new RegExp(search1.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') } });
  console.log("Found res1:", res1.length);
  
  const res2 = await Item.find({ description: { $regex: /Transformer/i } });
  console.log("Total Transformers in DB:", res2.length);
  
  // Just log all Transformers to see their exact string
  if (res2.length > 0) {
     console.log(res2.map(i => i.description));
  }

  process.exit(0);
}
check().catch(console.error);
