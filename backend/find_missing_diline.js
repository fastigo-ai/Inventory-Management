const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const pis = await mongoose.connection.db.collection('purchaseinvoices').find({}).toArray();
  
  let unmappedQty = 0;
  let unmappedCount = 0;
  pis.forEach(pi => {
      pi.lineItems?.forEach(line => {
          if (line.diId && !line.diLineId) {
              unmappedCount++;
              unmappedQty += Number(line.quantity) || Number(line.invoiceQuantity) || 0;
              // console.log(`PI ${pi.invoiceNumber} has line item ${line.itemName} with diId ${line.diId} but NO diLineId. Qty: ${line.quantity}`);
          }
      });
  });
  
  console.log(`Found ${unmappedCount} PI line items that are mapped to a DI but MISSING a diLineId!`);
  console.log(`Total quantity on these unmapped lines: ${unmappedQty}`);
  
  process.exit(0);
}
run();
