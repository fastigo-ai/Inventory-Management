import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  // Find all JMCs where item description contains STP
  const jmcs = await db.collection('jmcregisters').find({ 'items.description': { $regex: /STP/i } }).toArray();
  console.log(`\nFound ${jmcs.length} JMC Records with STP`);

  for (const jmc of jmcs) {
    for (const item of jmc.items || []) {
      if ((item.description || '').toLowerCase().includes('stp')) {
        const qty = Number(item.claimedQty || item.approvedQty || 0);
        const loa = item.loaSerialNo || 'Missing LOA';
        console.log(`JMC No: ${jmc.jmcNumber || jmc._id} | Circle: ${jmc.circle} | Qty: ${qty} | LOA: ${loa} | Item: ${item.description}`);
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
