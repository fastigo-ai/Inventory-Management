import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const stps = await db.collection('items').find({ 'dynamicData.itemName': 'STP 9 MTR' }).toArray();
  const tc = stps.length > 0 ? stps[0].dynamicData.tempCode : null;
  console.log('STP 9 MTR tempCode:', tc);

  if (tc) {
      const mins = await db.collection('contractorassignments').find({
          'lineItems.tempCode': tc
      }).toArray();
      
      console.log(`Found ${mins.length} MINs for STP 9 MTR`);
      for (const m of mins.slice(0, 3)) {
          console.log(`MIN ${m.assignmentNumber}: location=${m.location}, orderNumber=${m.orderNumber}, demandNo=${m.demandNo}, subject=${m.subject}`);
          const line = m.lineItems.find((l: any) => l.tempCode === tc);
          console.log(`  Line item: qty=${line.quantity}, activity=${line.activity}, itemName=${line.itemName}`);
      }
  }

  process.exit(0);
}

run().catch(console.error);
