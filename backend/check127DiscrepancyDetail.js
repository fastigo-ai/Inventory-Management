const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));

  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  const inwards = await StoreInwardEntry.find({ tempCode: '127', status: { $in: ['APPROVED', 'VERIFIED'] } }).lean();
  
  const piQtys = {};
  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      if (String(li.tempCode).trim() === '127') {
        const key = String(pi._id) + '_' + String(li.itemId);
        piQtys[key] = (piQtys[key] || 0) + Number(li.quantity || 0);
      }
    });
  });

  const inwQtys = {};
  inwards.forEach(inw => {
    const key = String(inw.purchaseInvoiceId) + '_' + String(inw.itemId);
    inwQtys[key] = (inwQtys[key] || 0) + Number(inw.totalQty || 0);
  });

  console.log("Mismatched PI vs Inward Qty for Temp Code 127:");
  let foundMismatch = false;
  
  for (const key of Object.keys(piQtys)) {
    const pQty = Math.round((piQtys[key] || 0) * 1000) / 1000;
    const iQty = Math.round((inwQtys[key] || 0) * 1000) / 1000;
    
    if (pQty !== iQty) {
      console.log(`Mismatch for PI_Item ${key}: PI Qty = ${pQty}, Inward Qty = ${iQty}, Diff = ${iQty - pQty}`);
      foundMismatch = true;
    }
  }

  // Check if there are inwards that don't have a matching PI (ghost inwards)
  for (const key of Object.keys(inwQtys)) {
    if (!piQtys[key] && inwQtys[key] > 0) {
      console.log(`Ghost Inwards for PI_Item ${key}: PI Qty = 0, Inward Qty = ${inwQtys[key]}`);
      foundMismatch = true;
    }
  }

  mongoose.disconnect();
}
run().catch(console.error);
