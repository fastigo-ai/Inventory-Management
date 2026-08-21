const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const circles = await mongoose.connection.collection('storeinwardentries').distinct('circle');
  console.log("=== INWARD CIRCLES ===");
  console.log(circles.map(c => `"${c}"`));
  
  const itemsCircles = await mongoose.connection.collection('items').distinct('dynamicData.circle');
  console.log("=== ITEM CIRCLES ===");
  console.log(itemsCircles.map(c => `"${c}"`));
  
  process.exit(0);
}
run().catch(console.error);
