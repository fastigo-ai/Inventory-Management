import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const items = await db.collection('items').find().limit(2000).toArray();
  const stpItems = items.filter(i => {
      const name = i.dynamicData?.itemName || '';
      return name.toUpperCase().includes('STP');
  });

  console.log(`Found ${stpItems.length} items with STP in name`);
  for (const item of stpItems) {
      if (item.dynamicData?.itemName?.toUpperCase().includes('STP 9')) {
         console.log(item.dynamicData.itemName);
      }
  }

  process.exit(0);
}

run().catch(console.error);
