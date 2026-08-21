import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const min = await db.collection('contractorassignments').findOne();
  console.log('Sample MIN keys:', Object.keys(min || {}));
  console.log('Sample MIN demand fields:', 
    Object.keys(min || {}).filter(k => k.toLowerCase().includes('demand'))
  );

  const demandNote = await db.collection('demandnotes').findOne();
  console.log('Sample DemandNote keys:', Object.keys(demandNote || {}));

  process.exit(0);
}

run().catch(console.error);
