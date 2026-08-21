const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const transfers = await mongoose.connection.collection('storetransfers').find().limit(5).toArray();
    
  console.log("=== RECENT STORE TRANSFERS ===");
  transfers.forEach(t => {
    console.log(`ID: ${t._id}, toStore: ${t.toStore}, fromStore: ${t.fromStore}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
