const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function groupByTempCode() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const entries = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 2800 MM/i }
  }).toArray();
  
  let tempCodeMap = {};
  
  for (let e of entries) {
    const qty = Number(e.invoiceQty || 0);
    
    // Check if tempCode is on the entry
    let tempCode = e.tempCode;
    
    // If not, fetch from item
    if (!tempCode && e.itemId) {
      const item = await db.collection('items').findOne({ _id: e.itemId });
      if (item && item.dynamicData && item.dynamicData.tempCode) {
        tempCode = item.dynamicData.tempCode;
      }
    }
    
    tempCode = tempCode || 'UNKNOWN';
    
    tempCodeMap[tempCode] = (tempCodeMap[tempCode] || 0) + qty;
  }
  
  console.log("=== INVOICE QTY BY TEMP CODE (2800 MM in Nahan) ===");
  for (const [code, qty] of Object.entries(tempCodeMap)) {
    console.log(`Temp Code: ${code} | Total Invoice Qty: ${qty}`);
  }

  // Let's also check 950 MM just in case they meant that one, to provide complete info
  const entries950 = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6, L: 950 MM/i }
  }).toArray();
  
  let tempCodeMap950 = {};
  for (let e of entries950) {
    const qty = Number(e.invoiceQty || 0);
    let tempCode = e.tempCode;
    if (!tempCode && e.itemId) {
      const item = await db.collection('items').findOne({ _id: e.itemId });
      if (item && item.dynamicData && item.dynamicData.tempCode) {
        tempCode = item.dynamicData.tempCode;
      }
    }
    tempCode = tempCode || 'UNKNOWN';
    tempCodeMap950[tempCode] = (tempCodeMap950[tempCode] || 0) + qty;
  }

  console.log("\n=== INVOICE QTY BY TEMP CODE (950 MM in Nahan) ===");
  for (const [code, qty] of Object.entries(tempCodeMap950)) {
    console.log(`Temp Code: ${code} | Total Invoice Qty: ${qty}`);
  }

  // Finally, let's just group ALL MS ANGLE 50X50X6 by tempCode regardless of length
  const entriesAll = await db.collection('storeinwardentries').find({
    circle: { $regex: /nahan/i },
    itemName: { $regex: /MS ANGLE 50X50X6/i }
  }).toArray();
  
  let tempCodeMapAll = {};
  for (let e of entriesAll) {
    const qty = Number(e.invoiceQty || 0);
    let tempCode = e.tempCode;
    if (!tempCode && e.itemId) {
      const item = await db.collection('items').findOne({ _id: e.itemId });
      if (item && item.dynamicData && item.dynamicData.tempCode) {
        tempCode = item.dynamicData.tempCode;
      }
    }
    tempCode = tempCode || 'UNKNOWN';
    tempCodeMapAll[tempCode] = (tempCodeMapAll[tempCode] || 0) + qty;
  }

  console.log("\n=== INVOICE QTY BY TEMP CODE (ALL MS ANGLE 50X50X6 in Nahan) ===");
  for (const [code, qty] of Object.entries(tempCodeMapAll)) {
    console.log(`Temp Code: ${code} | Total Invoice Qty: ${qty}`);
  }

  await mongoose.disconnect();
}

groupByTempCode();
