const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const pis = await mongoose.connection.db.collection('purchaseinvoices').find({}).toArray();
  
  const statusCounts = {};
  pis.forEach(pi => {
      statusCounts[pi.status] = (statusCounts[pi.status] || 0) + 1;
  });
  
  console.log('PurchaseInvoice Status Counts:', statusCounts);
  
  let totalConsumed = 0;
  let totalConsumedDraft = 0;
  
  pis.forEach(pi => {
      pi.lineItems?.forEach(line => {
          if (line.diId) {
              const qty = Number(line.quantity) || Number(line.invoiceQuantity) || 0;
              totalConsumed += qty;
              if (pi.status === 'Draft' || pi.status === 'Cancelled' || pi.status === 'Void') {
                  totalConsumedDraft += qty;
              }
          }
      });
  });
  
  console.log(`Total Consumed Quantity from all PIs: ${totalConsumed}`);
  console.log(`Total Consumed Quantity from Draft/Cancelled/Void PIs: ${totalConsumedDraft}`);
  
  process.exit(0);
}
run();
