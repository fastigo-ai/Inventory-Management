require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const mhrovsColl = db.collection('mhrovs');
  const disColl = db.collection('dis');

  const rohruMhrovs = await mhrovsColl.find({ $or: [{ circle: /rohru/i }, { division: /rohru/i }] }).toArray();
  const rohruDis = await disColl.find({ $or: [{ circle: /rohru/i }, { division: /rohru/i }] }).toArray();

  console.log('--- Rohru MHROVs ---');
  console.log(`Count: ${rohruMhrovs.length}`);
  rohruMhrovs.forEach(m => {
    console.log(`MHROV No: ${m.mhrovNumber || m._id}`);
    m.items?.forEach(item => {
      console.log(`  - Item ID: ${item.itemId}, Qty: ${item.acceptedQty || item.quantity}`);
    });
  });

  console.log('\n--- Rohru DIs ---');
  console.log(`Count: ${rohruDis.length}`);
  rohruDis.forEach(d => {
    console.log(`DI No: ${d.diNumber || d._id}`);
    d.items?.forEach(item => {
      console.log(`  - Item ID: ${item.itemId}, Qty: ${item.diQty || item.quantity}`);
    });
  });

  mongoose.disconnect();
}

checkData().catch(console.error);
