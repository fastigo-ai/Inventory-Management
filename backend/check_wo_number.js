const mongoose = require('mongoose');
require('dotenv').config();
async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const wos = await mongoose.connection.db.collection('contractorworkorders').find({ workOrderNumber: 'WO-2609-0003' }).toArray();
  console.log('Work Orders with number WO-2609-0003:');
  wos.forEach(wo => console.log(wo._id, wo.handoverStatus, wo.contractorId));
  process.exit(0);
}
run();
