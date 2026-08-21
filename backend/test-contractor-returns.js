const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const returns = await mongoose.connection.collection('contractorreturns').find({}).toArray();
  console.log(`Found ${returns.length} contractor returns in total.`);
  if (returns.length > 0) {
    console.log("Sample 1:");
    console.log(JSON.stringify(returns[0], null, 2));
  }
  process.exit(0);
}
run().catch(console.error);
