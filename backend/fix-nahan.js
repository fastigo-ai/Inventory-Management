const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find all inwards in Rohru that were meant for Nahan (e.g., PI in Nahan, but inward in Rohru)
  // Actually, I know the 14 inwards of 170 qty STP 9 MTR are in Rohru.
  const entries = await mongoose.connection.collection('storeinwardentries')
    .updateMany(
      { circle: 'Rohru', invoiceQty: 170, tempCode: "1" },
      { $set: { circle: 'Nahan' } }
    );
    
  console.log(`Moved ${entries.modifiedCount} inwards from Rohru to Nahan.`);
  
  process.exit(0);
}
run().catch(console.error);
