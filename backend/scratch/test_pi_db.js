const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const pis = await mongoose.connection.db.collection('purchaseinvoices').find({ circle: { $exists: true } }).limit(1).toArray();
  console.log('With circle:', pis.length > 0);
  const pisPkg = await mongoose.connection.db.collection('purchaseinvoices').find({ package: { $exists: true } }).limit(1).toArray();
  console.log('With package:', pisPkg.length > 0);
  process.exit(0);
}
run();
