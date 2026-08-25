const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));

  const inwards = await StoreInwardEntry.find({ tempCode: '4' }).lean();
  
  inwards.forEach(inw => {
    const tQty = Number(inw.totalQty || 0);
    const iQty = Number(inw.invoiceQty || 0);
    if (tQty !== iQty) {
      console.log(`Mismatch found! _id: ${inw._id}, tempCode: 4, totalQty: ${tQty}, invoiceQty: ${iQty}`);
      console.log(`Raw Document:`, JSON.stringify(inw, null, 2));
    }
  });

  mongoose.disconnect();
}
run().catch(console.error);
