const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const returns = await mongoose.connection.collection('contractorreturns').find().limit(5).toArray();
    
  console.log("=== RECENT CONTRACTOR RETURNS ===");
  returns.forEach(r => {
    console.log(`ID: ${r._id}, Circle: ${r.circle}, Division: ${r.division}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
