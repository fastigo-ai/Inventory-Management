import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const mins = await db.collection('contractorassignments').find({
      demandNo: { $exists: true, $ne: '' }
  }).limit(5).toArray();
  
  console.log(`Found ${mins.length} MINs with demandNo`);
  for (const m of mins) {
      console.log(`MIN ${m.assignmentNumber}: demandNo=${m.demandNo}`);
      for (const item of m.lineItems) {
         console.log(`  - Item ${item.itemName}: tempCode=${item.tempCode}, loaSrNo=${item.loaSrNo}`);
      }
  }

  process.exit(0);
}

run().catch(console.error);
