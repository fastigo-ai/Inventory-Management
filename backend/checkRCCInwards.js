const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({ status: String, tempCode: String, totalQty: Number, invoiceQty: Number }));

  const inwards = await StoreInwardEntry.find({ tempCode: '4' }).lean();
  let totalQty = 0;
  let invQty = 0;
  inwards.forEach(inw => {
    totalQty += Number(inw.totalQty || 0);
    invQty += Number(inw.invoiceQty || 0);
  });

  console.log(`StoreInwardEntry for RCC Muff:`);
  console.log(`Sum of totalQty: ${totalQty}`);
  console.log(`Sum of invoiceQty: ${invQty}`);
  mongoose.disconnect();
}
run().catch(console.error);
