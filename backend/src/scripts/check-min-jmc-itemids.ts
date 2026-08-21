import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const stps = await db.collection('items').find({ itemName: { $regex: /STP/i } }).limit(5).toArray();
  for (const stp of stps) {
    console.log(`- ${stp.itemName} (TempCode: ${stp.tempCode})`);
  }
  
  process.exit(0);
}

run().catch(console.error);
