import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  // 1. Get all Master Item IDs for "STP 9"
  const stps = await db.collection('items').find({ 'dynamicData.name': { $regex: /STP 9/i } }).toArray();
  const stpIds = stps.map(i => i._id.toString());
  console.log(`Found ${stpIds.length} Master Items matching /STP 9/i`);

  // 2. Fetch all JMCs
  const jmcs = await db.collection('jmcregisters').find().toArray();
  let updatedJmcsCount = 0;
  let updatedItemsCount = 0;

  for (const jmc of jmcs) {
    let jmcModified = false;

    // Check each line item in the JMC
    for (const item of jmc.items || []) {
      const isMatch = (item.description && item.description.toUpperCase().includes('STP 9')) ||
                      (item.itemId && stpIds.includes(item.itemId.toString()));
      
      if (isMatch) {
        if (item.loaSerialNo) {
           item.loaSerialNo = ""; // Clear the LOA Serial Number so it gets distributed proportionally
           jmcModified = true;
           updatedItemsCount++;
        }
      }
    }

    // Save the JMC if modified
    if (jmcModified) {
       await db.collection('jmcregisters').updateOne(
           { _id: jmc._id },
           { $set: { items: jmc.items } }
       );
       updatedJmcsCount++;
    }
  }

  console.log(`Successfully updated ${updatedItemsCount} line items across ${updatedJmcsCount} JMC records!`);
  process.exit(0);
}

run().catch(console.error);
