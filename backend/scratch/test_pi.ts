import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const pi = await mongoose.connection.db.collection('purchaseinvoices').findOne({});
  console.log(JSON.stringify(pi, null, 2));
  process.exit(0);
}
run();
