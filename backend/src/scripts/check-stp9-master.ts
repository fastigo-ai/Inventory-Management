import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const stps = await db.collection('items').find({ 'dynamicData.name': { $regex: /STP 9/i } }).toArray();
  const stpIds = stps.map(i => i._id.toString());

  console.log("Master Items STP 9 MTR:");
  for (const stp of stps) {
      console.log(`- TempCode: ${stp.dynamicData.tempCode} | LOA: ${stp.dynamicData.loaSerialNo} | Circle: ${stp.dynamicData.circle} | Pkg: ${stp.dynamicData.package}`);
  }

  process.exit(0);
}

run().catch(console.error);
