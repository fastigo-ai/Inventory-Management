const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '/Users/Apple/Desktop/Inventory-Management/backend/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const contractors = await mongoose.connection.collection('contractors').find().limit(2).toArray();
  console.log(JSON.stringify(contractors, null, 2));
  process.exit(0);
}

run();
