const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));
  
  // 1. Total records in StoreInwardEntry for Nahan
  const allNahan = await StoreInwardEntry.countDocuments({
    circle: { $regex: /nahan/i }
  });
  
  // 2. Pending Store Receipts for Nahan (from PI)
  const pendingReceipts = await StoreInwardEntry.countDocuments({
    circle: { $regex: /nahan/i },
    status: { $in: ['PENDING_RECEIPT', 'DRAFT'] }
  });
  
  // 3. Inward Register data for Nahan (Inwarded / Approved)
  const inwardRegister = await StoreInwardEntry.countDocuments({
    circle: { $regex: /nahan/i },
    status: { $nin: ['PENDING_RECEIPT', 'DRAFT'] }
  });
  
  console.log(`--- NAHAN STORE DATA FROM PI ---`);
  console.log(`Total PI line items for Nahan: ${allNahan}`);
  console.log(`Store Receipts (Pending): ${pendingReceipts}`);
  console.log(`Inward Register (Inwarded/Approved): ${inwardRegister}`);
  
  // Just to be sure, check if there are any that are linked to PI
  const fromPi = await StoreInwardEntry.countDocuments({
    circle: { $regex: /nahan/i },
    purchaseInvoiceId: { $exists: true, $ne: null }
  });
  
  console.log(`\nOf total Nahan items, how many originated from a Purchase Invoice? : ${fromPi}`);

  process.exit();
}

checkData().catch(console.error);
