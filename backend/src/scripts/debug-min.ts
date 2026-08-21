import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  const db = mongoose.connection.db;
  if (!db) return;

  const min = await db.collection('contractorassignments').findOne();
  console.log('Sample MIN line items:');
  console.dir(min?.lineItems?.slice(0, 3), { depth: null });

  const jmc = await db.collection('jmcregisters').findOne();
  console.log('Sample JMC items:');
  console.dir(jmc?.items?.slice(0, 3), { depth: null });

  process.exit(0);
}

run().catch(console.error);
