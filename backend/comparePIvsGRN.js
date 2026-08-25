const mongoose = require('mongoose');
const fs = require('fs');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function comparePIvsGRN() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const pis = await db.collection('purchaseinvoices').find({}).toArray();
  const inwards = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).toArray();
  
  let piMap = {};
  
  pis.forEach(pi => {
    if (!pi.lineItems) return;
    pi.lineItems.forEach(i => {
      if (i.circle && i.circle.match(/nahan/i)) {
        const name = i.itemName || 'Unknown';
        if (name.toUpperCase().includes('ANGLE 50X50X6, L: 2800 MM')) {
           const qty = Number(i.invoiceQty || i.quantity || 0);
           const invNo = pi.invoiceNumber;
           piMap[invNo] = (piMap[invNo] || 0) + qty;
        }
      }
    });
  });

  let grnMap = {};
  inwards.forEach(e => {
    const qty = Number(e.totalQty || 0);
    const invNo = e.invoiceNumber;
    grnMap[invNo] = (grnMap[invNo] || 0) + qty;
  });
  
  let report = "Invoice No | PI Qty | GRN Qty (totalQty) | Diff (Missing GRN)\n";
  report += "--------------------------------------------------------\n";
  
  let totalPI = 0;
  let totalGRN = 0;
  
  // get all unique invoice numbers
  const allInvoices = new Set([...Object.keys(piMap), ...Object.keys(grnMap)]);
  
  for (const invNo of Array.from(allInvoices).sort()) {
    const piQ = piMap[invNo] || 0;
    const grnQ = grnMap[invNo] || 0;
    totalPI += piQ;
    totalGRN += grnQ;
    
    if (piQ !== grnQ) {
      report += `${invNo.padEnd(10)} | ${String(piQ).padEnd(6)} | ${String(grnQ).padEnd(18)} | ${piQ - grnQ}\n`;
    }
  }
  
  report += "--------------------------------------------------------\n";
  report += `TOTAL      | ${String(totalPI).padEnd(6)} | ${String(totalGRN).padEnd(18)} | ${totalPI - totalGRN}\n`;
  
  console.log(report);
  
  // check how much invoiceQty gives us
  let grnInvQtyMap = {};
  inwards.forEach(e => {
    const qty = Number(e.invoiceQty || 0);
    const invNo = e.invoiceNumber;
    grnInvQtyMap[invNo] = (grnInvQtyMap[invNo] || 0) + qty;
  });
  
  let totalGRNInv = 0;
  let report2 = "\nInvoice No | PI Qty | GRN Qty (invoiceQty) | Diff (Missing GRN)\n";
  for (const invNo of Array.from(allInvoices).sort()) {
    const piQ = piMap[invNo] || 0;
    const grnQ = grnInvQtyMap[invNo] || 0;
    totalGRNInv += grnQ;
    if (piQ !== grnQ) {
      report2 += `${invNo.padEnd(10)} | ${String(piQ).padEnd(6)} | ${String(grnQ).padEnd(20)} | ${piQ - grnQ}\n`;
    }
  }
  console.log(report2);
  console.log(`TOTAL GRN (invoiceQty): ${totalGRNInv}`);

  await mongoose.disconnect();
}

comparePIvsGRN();
