const mongoose = require('mongoose');
require('dotenv').config();

async function checkJmcDone() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find Contractor
    const contractors = await db.collection('contractors').find({}).toArray();
    const contractor = contractors.find(c => {
      const name = (c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name || "").toLowerCase();
      return name.includes("gian chand");
    });
    
    if (!contractor) {
      console.log("Could not find contractor matching 'gian chand'");
      return;
    }
    
    console.log(`Found Contractor: ${contractor.name || contractor.dynamicData?.companyName || contractor.dynamicData?.name} (${contractor._id})`);
    
    // Find JMCs
    const jmcs = await db.collection('jmcregisters').find({
      contractorId: contractor._id,
      circle: { $regex: new RegExp('nahan', 'i') }
      // status: 'Approved' // wait, store.controller filters jmcRecords by Approved
    }).toArray();
    
    console.log(`Found ${jmcs.length} JMCs for this contractor in Nahan.`);
    
    let totalJmcDone = 0;
    let foundItems = [];
    
    jmcs.forEach(jmc => {
      if (jmc.status !== 'Approved') return;
      if (jmc.items) {
        jmc.items.forEach(item => {
          if (String(item.loaSrNo) === '1331') {
            const qty = (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
            totalJmcDone += qty;
            foundItems.push({
              jmcNumber: jmc.jmcNumber,
              date: jmc.date,
              qty: qty,
              status: jmc.status
            });
          }
        });
      }
    });
    
    console.log(`Total JMC Done for LOA 1331: ${totalJmcDone}`);
    console.log("Details:");
    console.log(foundItems);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkJmcDone();
