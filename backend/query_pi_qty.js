const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const dis = await mongoose.connection.db.collection('dis').find({}).toArray();
  const pis = await mongoose.connection.db.collection('storeinwardentries').find({}).toArray();
  
  let totalOrdered = 0;
  dis.forEach(d => {
      d.lineItems?.forEach(i => {
          totalOrdered += Number(i.quantity) || 0;
      });
  });
  
  let totalConsumed = 0;
  pis.forEach(pi => {
      // In getDIInsights, it iterates pi.lineItems
      // Does storeinwardentries have lineItems?
      if (pi.lineItems) {
          pi.lineItems.forEach(line => {
              if (line.diId) {
                  totalConsumed += Number(line.quantity) || Number(line.invoiceQuantity) || 0;
              }
          });
      }
      // wait, what about pi.packingList?
  });
  
  console.log(`Total Ordered: ${totalOrdered}`);
  console.log(`Total Consumed (via PI lineItems): ${totalConsumed}`);
  
  if (totalOrdered > 0) {
      console.log(`Fulfillment %: ${Math.round((totalConsumed / totalOrdered) * 100)}%`);
  }
  
  process.exit(0);
}
run();
