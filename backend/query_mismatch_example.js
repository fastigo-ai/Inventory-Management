const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const pis = await mongoose.connection.db.collection('purchaseinvoices').find({}).toArray();
  const dis = await mongoose.connection.db.collection('dis').find({}).toArray();
  
  for (const pi of pis) {
      for (const line of (pi.lineItems || [])) {
          if (line.diId && !line.diLineId) {
              const di = dis.find(d => d._id.toString() === line.diId.toString());
              if (di) {
                  console.log(`\nFound Mismatch Example in PI ${pi.invoiceNumber}:`);
                  console.log(`PI tried to bill Item: "${line.itemName}", Serial: "${line.loaSerialNo}", Circle: "${line.circle}" with Qty ${line.quantity} for DI ${di.diNumber}`);
                  console.log(`But DI ${di.diNumber} contains these items:`);
                  di.lineItems.forEach(dli => {
                      console.log(`  - Item: "${dli.itemName}", Serial: "${dli.loaSerialNo}", Circle: "${dli.circle}"`);
                  });
                  process.exit(0);
              }
          }
      }
  }
}
run();
