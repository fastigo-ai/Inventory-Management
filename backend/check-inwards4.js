const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const dis = await mongoose.connection.collection('dis')
    .find({ 'lineItems.quantity': 170 })
    .toArray();
    
  const diIds = dis.map(di => di._id);
  
  const inwards = await mongoose.connection.collection('storeinwardentries')
    .find({ diId: { $in: diIds } })
    .toArray();
    
  console.log(`Found ${inwards.length} inwards connected to the DIs that have 170 qty`);
  inwards.forEach(e => {
    console.log(`ID: ${e._id}, DI: ${e.diRefNo}, Item: ${e.itemName}, Circle: ${e.circle}, Qty: ${e.invoiceQty}`);
  });
  
  // Also check if any inward was created from a PI connected to these DIs
  const pos = await mongoose.connection.collection('purchaseorders').find({ 'lineItems.quantity': 170 }).toArray();
  const poIds = pos.map(po => po._id);
  const pis = await mongoose.connection.collection('purchaseinvoices').find({ purchaseOrderId: { $in: poIds } }).toArray();
  const piIds = pis.map(pi => pi._id);
  
  const inwardsFromPis = await mongoose.connection.collection('storeinwardentries')
    .find({ purchaseInvoiceId: { $in: piIds } })
    .toArray();
    
  console.log(`\nFound ${inwardsFromPis.length} inwards from PIs linked to POs with 170 qty`);
  
  process.exit(0);
}
run().catch(console.error);
