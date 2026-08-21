const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const sample = await mongoose.connection.collection('items').findOne({});
  if (sample) {
    console.log("Sample Item dynamicData keys:");
    console.log(Object.keys(sample.dynamicData || {}));
    console.log("Sample dynamicData:");
    console.log(sample.dynamicData);
  } else {
    console.log("No items found.");
  }
  
  process.exit(0);
}
run().catch(console.error);
