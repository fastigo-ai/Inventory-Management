const mongoose = require('mongoose');
require('dotenv').config();

async function verifyValues() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Get Kushal Electrical
    const contractors = await db.collection('contractors').find({}).toArray();
    const contractor = contractors.find(c => {
      const name = (c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name || "").toLowerCase();
      return name.includes("kushal");
    });
    
    if (!contractor) {
      console.log("Could not find contractor matching 'kushal'");
      return;
    }
    const contractorId = contractor._id;
    console.log(`Contractor: ${contractor.name || contractor.dynamicData?.companyName || contractor.dynamicData?.name}`);

    // 2. Get Item 37
    let item = await db.collection('items').findOne({ tempCode: "37" });
    if (!item) {
        item = await db.collection('items').findOne({ "dynamicData.tempCode": "37" });
    }
    const itemId = item._id;
    console.log(`Item: ${item.itemName || item.description || item.dynamicData?.name}`);

    // 3. Store Issued (ContractorAssignment)
    const assignments = await db.collection('contractorassignments').find({
      contractorId: contractorId,
      status: { $ne: 'Cancelled' }
    }).toArray();
    
    let storeIssuedQty = 0;
    assignments.forEach(asg => {
      asg.lineItems?.forEach(li => {
        if (li.tempCode == "37" || String(li.itemId) === String(itemId)) {
          storeIssuedQty += Number(li.quantity) || 0;
        }
      });
    });
    console.log(`Store Issued Qty (ContractorAssignment): ${storeIssuedQty}`);

    // 4. Past Demand Notes
    const pastDemandNotes = await db.collection('demandnotes').find({
      status: { $in: ['Approved', 'Fulfilled'] },
      circle: { $regex: new RegExp('nahan', 'i') }
    }).toArray();
    
    let pastDemandQty = 0;
    pastDemandNotes.forEach(dn => {
      dn.items?.forEach(dnItem => {
        if (dnItem.tempCode == "37" || String(dnItem.itemId) === String(itemId)) {
          pastDemandQty += dnItem.demandQty || 0;
        }
      });
    });
    console.log(`Past Demand Note Qty: ${pastDemandQty}`);

    const alreadyIssued = Math.max(storeIssuedQty, pastDemandQty);
    console.log(`Already Issued Qty (Math.max): ${alreadyIssued}`);

    // 5. Stock Balance
    let initialStock = 0;
    if (item.dynamicData?.stockLocations) {
       const loc = item.dynamicData.stockLocations.find(l => String(l.circle).toLowerCase() === 'nahan');
       if (loc) initialStock = Number(loc.quantity || 0);
    }
    if (initialStock === 0) {
       initialStock = Number(item.dynamicData?.stockBal || item.dynamicData?.stockBalance || item.dynamicData?.stock || item.dynamicData?.quantity || 0);
    }
    
    const summary = await db.collection('itemsummaries').findOne({
        itemId: itemId,
        circle: { $regex: new RegExp('nahan', 'i') }
    });

    let act = 0, tin = 0, tout = 0, iss = 0, ret = 0;
    if (summary) {
       act = summary.actQty || 0;
       tin = summary.transferInQty || 0;
       tout = summary.transferOutQty || 0;
       iss = summary.issuedQty || 0;
       ret = summary.returnedQty || 0;
    }

    const baseStock = act > 0 ? act : initialStock;
    const stockBal = Math.max(0, baseStock + tin + ret - iss - tout);
    
    console.log(`\nStock Balance Details:`);
    console.log(`Initial Stock from dynamicData: ${initialStock}`);
    console.log(`ItemSummary: act=${act}, tin=${tin}, tout=${tout}, iss=${iss}, ret=${ret}`);
    console.log(`Base Stock used: ${baseStock}`);
    console.log(`Calculated Stock Bal: ${stockBal}`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
verifyValues();
