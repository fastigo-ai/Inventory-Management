const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  // Get all unique circles from PIs
  const piCircles = await mongoose.connection.collection('purchaseinvoices').distinct('lineItems.circle');
  const diCircles = await mongoose.connection.collection('dis').distinct('lineItems.circle');
  const diTopCircles = await mongoose.connection.collection('dis').distinct('circle');

  const allCircles = [...new Set([...piCircles, ...diCircles, ...diTopCircles])].filter(c => c && c.trim() !== '');
  
  console.log("=== CIRCLES FOUND IN SYSTEM ===");
  allCircles.forEach(c => console.log(` - ${c}`));
  console.log(`\nTotal Circles: ${allCircles.length}`);

  process.exit(0);
}
run().catch(console.error);
