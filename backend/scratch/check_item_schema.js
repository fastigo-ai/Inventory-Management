require('dotenv').config();
const mongoose = require('mongoose');

async function checkItemSchema() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const itemsColl = db.collection('items');
  const items = await itemsColl.find({ isDeleted: false }).limit(5).toArray();
  
  console.log(JSON.stringify(items, null, 2));
  
  mongoose.disconnect();
}
checkItemSchema().catch(console.error);
