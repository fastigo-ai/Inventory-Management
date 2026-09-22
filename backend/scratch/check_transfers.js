const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority');
  const StoreTransfer = mongoose.model('StoreTransfer', new mongoose.Schema({}, { strict: false }));
  const docs = await StoreTransfer.find({ toStore: /Rohru/i }).lean();
  console.log(`Found ${docs.length} transfers to Rohru`);
  for (let d of docs) {
    console.log(`- from: ${d.fromStore}, to: ${d.toStore}, status: ${d.status}`);
  }
  await mongoose.disconnect();
}
run().catch(console.error);
