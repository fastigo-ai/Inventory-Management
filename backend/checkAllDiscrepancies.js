const mongoose = require('mongoose');
const uri = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const PurchaseInvoice = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));
  const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

  console.log("Fetching data...");
  const pis = await PurchaseInvoice.find({ status: { $ne: 'Cancelled' } }).lean();
  const inwards = await StoreInwardEntry.find({ status: { $in: ['APPROVED', 'VERIFIED'] } }).lean();
  const items = await Item.find({}).lean();

  const tempCodeMap = {};
  items.forEach(it => {
    if (it.dynamicData && it.dynamicData.tempCode) {
      tempCodeMap[String(it.dynamicData.tempCode).trim()] = it.dynamicData.name || 'Unknown Item';
    }
  });

  const piTotals = {};
  pis.forEach(pi => {
    (pi.lineItems || []).forEach(li => {
      const tc = String(li.tempCode || '').trim();
      if (tc) {
        piTotals[tc] = (piTotals[tc] || 0) + Number(li.quantity || 0);
      }
    });
  });

  const inwardTotals = {};
  inwards.forEach(inw => {
    const tc = String(inw.tempCode || '').trim();
    if (tc) {
      inwardTotals[tc] = (inwardTotals[tc] || 0) + Number(inw.totalQty || 0);
    }
  });

  const allTempCodes = new Set([...Object.keys(piTotals), ...Object.keys(inwardTotals)]);
  
  let mismatchCount = 0;
  console.log("\n--- DISCREPANCY REPORT ---");
  console.log(String("TempCode").padEnd(10) | String("Item Name").padEnd(40) | String("PI Qty").padEnd(15) | String("Inward Qty").padEnd(15) | String("Difference"));
  console.log("-".repeat(95));

  for (const tc of allTempCodes) {
    if (!tc) continue;
    const pQty = piTotals[tc] || 0;
    const iQty = inwardTotals[tc] || 0;
    
    // We only round to 3 decimal places to avoid floating point errors
    const pRounded = Math.round(pQty * 1000) / 1000;
    const iRounded = Math.round(iQty * 1000) / 1000;
    
    if (pRounded !== iRounded) {
      const name = tempCodeMap[tc] || 'Unknown';
      const diff = pRounded - iRounded;
      console.log(String(tc).padEnd(10) + " | " + String(name).padEnd(40) + " | " + String(pRounded).padEnd(15) + " | " + String(iRounded).padEnd(15) + " | " + String(diff));
      mismatchCount++;
    }
  }

  console.log("-".repeat(95));
  console.log(`Total mismatched items: ${mismatchCount}`);
  
  mongoose.disconnect();
}
run().catch(console.error);
