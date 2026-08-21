const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Just print the first 2 items
  const items = await mongoose.connection.collection('items').find({}).limit(2).toArray();
  console.log("Items:");
  console.log(items);
  
  process.exit(0);
}
run().catch(console.error);
