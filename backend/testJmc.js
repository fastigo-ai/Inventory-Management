const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    // Find contractor Guru Kirpa
    const contractor = await db.collection('contractors').findOne({
      "dynamicData.companyName": { $regex: /Guru Kirpa/i }
    });
    if (!contractor) {
      console.log("Contractor not found");
      return;
    }
    console.log("Contractor ID:", contractor._id);

    // Find JmcRegister for this contractor
    const jmcs = await db.collection('jmcregisters').find({ contractorId: contractor._id }).toArray();
    console.log("Found JMC Registers:", jmcs.length);
    let jmcQty = 0;
    
    jmcs.forEach(jmc => {
      jmc.items?.forEach(jmcItem => {
         // Let's just log one item to see what data it has
         console.log("JMC Item:", {
           itemId: jmcItem.itemId,
           tempCode: jmcItem.tempCode,
           loaSrNo: jmcItem.loaSrNo,
           loaSerialNo: jmcItem.loaSerialNo,
           activity: jmcItem.activity,
           description: jmcItem.description,
           claimedQty: jmcItem.claimedQty,
           approvedQty: jmcItem.approvedQty
         });
         jmcQty += (Number(jmcItem.claimedQty) || 0) + (Number(jmcItem.approvedQty) || 0);
      });
    });

    console.log("Total JMC Qty for this contractor:", jmcQty);
    
    // Find WipRegister
    const wips = await db.collection('wipregisters').find({ contractorId: contractor._id }).toArray();
    console.log("Found WIP Registers:", wips.length);

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
