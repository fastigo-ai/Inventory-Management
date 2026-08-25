const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0";

async function deleteWO() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const coll = db.collection('contractorworkorders');
  const wo = await coll.findOne({ workOrderNumber: 'WO-2608-0001' });
  
  if (wo) {
    console.log('Found Work Order:', wo.workOrderNumber);
    await coll.deleteOne({ workOrderNumber: 'WO-2608-0001' });
    console.log('Work Order deleted successfully.');
  } else {
    console.log('Work Order WO-2608-0001 not found.');
  }

  await mongoose.disconnect();
}

deleteWO().catch(console.error);
