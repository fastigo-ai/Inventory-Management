import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const item = await db.collection('items').findOne();
  console.log('Keys in item.dynamicData:', Object.keys(item?.dynamicData || {}));
  console.log('Sample item:', JSON.stringify(item?.dynamicData, null, 2));

  process.exit(0);
}

run().catch(console.error);
