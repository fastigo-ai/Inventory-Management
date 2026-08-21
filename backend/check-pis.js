const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'destinations.circle': 'Nahan' })
    .toArray();
    
  console.log("=== PURCHASE INVOICES FOR NAHAN ===");
  pis.forEach(pi => {
    console.log(`PI Number: ${pi.invoiceNumber}`);
    pi.destinations.forEach(d => {
      if (d.circle === 'Nahan' && d.quantity === 170) {
        console.log(`  - Match: ${d.quantity} in Nahan (Subcircle: ${d.subcircle})`);
      }
    });
  });
  
  process.exit(0);
}
run().catch(console.error);
