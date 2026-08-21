const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const pis = await mongoose.connection.collection('purchaseinvoices')
    .find({ 'lineItems.circle': 'Nahan' })
    .toArray();
    
  console.log(`=== PURCHASE INVOICES FOR NAHAN (${pis.length}) ===`);
  pis.forEach(pi => {
    pi.lineItems.forEach(item => {
      if (item.circle === 'Nahan') {
        console.log(`PI: ${pi.invoiceNumber}, Item: ${item.itemName} (TempCode: ${item.tempCode}), Qty: ${item.quantity}`);
      }
    });
  });
  
  // Also let's check purchase orders
  const pos = await mongoose.connection.collection('purchaseorders')
    .find({ 'lineItems.circle': 'Nahan' })
    .toArray();
    
  console.log(`\n=== PURCHASE ORDERS FOR NAHAN (${pos.length}) ===`);
  pos.forEach(po => {
    po.lineItems.forEach(item => {
      if (item.circle === 'Nahan') {
        console.log(`PO: ${po.purchaseOrderNumber}, Item: ${item.itemName} (TempCode: ${item.tempCode}), Qty: ${item.quantity}`);
      }
    });
  });

  process.exit(0);
}
run().catch(console.error);
