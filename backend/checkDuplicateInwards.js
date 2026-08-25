const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));

  const inwards = await StoreInwardEntry.find({ tempCode: '127', status: { $in: ['APPROVED', 'VERIFIED'] } }).lean();
  
  const piMap = {};
  let duplicateCount = 0;
  
  inwards.forEach(inw => {
    const key = String(inw.purchaseInvoiceId) + '_' + String(inw.itemId);
    if (!piMap[key]) {
      piMap[key] = [];
    }
    piMap[key].push(inw);
  });

  console.log("Checking for duplicate Inwards from the same Purchase Invoice for Temp Code 127...");
  
  for (const [key, entries] of Object.entries(piMap)) {
    if (entries.length > 1) {
      console.log(`\nDuplicate found! purchaseInvoiceId_itemId: ${key}`);
      entries.forEach((e, idx) => {
        console.log(`  Entry ${idx + 1}: _id: ${e._id}, totalQty: ${e.totalQty}, grNumber: ${e.grNumber}`);
      });
      duplicateCount++;
    }
  }

  console.log(`\nTotal sets of duplicates: ${duplicateCount}`);
  mongoose.disconnect();
}
run().catch(console.error);
