const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const assignments = await mongoose.connection.collection('contractorassignments').find().limit(5).toArray();
    
  console.log("=== RECENT CONTRACTOR ASSIGNMENTS (MIN) ===");
  assignments.forEach(a => {
    console.log(`ID: ${a._id}, Circle: ${a.circle}, Division: ${a.division}`);
  });
  
  process.exit(0);
}
run().catch(console.error);
