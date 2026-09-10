const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0');
  const db = mongoose.connection.db;
  const contractors = await db.collection('contractors').find({
    $or: [
      { 'name': { $regex: 'gyan chand', $options: 'i' } },
      { 'dynamicData.companyName': { $regex: 'gyan chand', $options: 'i' } },
      { 'dynamicData.name': { $regex: 'gyan chand', $options: 'i' } },
      { 'dynamicData.vendorName': { $regex: 'gyan chand', $options: 'i' } }
    ]
  }).toArray();
  const ids = contractors.map(c => c._id);
  console.log('Found Contractors:', contractors.map(c => c.name || c.dynamicData?.companyName || c.dynamicData?.name));
  const jmcs = await db.collection('jmcregisters').find({ contractorId: { $in: ids } }).toArray();
  console.log('Total JMCs for Gyan Chand:', jmcs.length);
  if (jmcs.length > 0) {
    console.log('Sample JMC:', jmcs[0].jmcNumber, jmcs[0].circle, jmcs[0].location);
  }
  mongoose.disconnect();
}
run().catch(console.error);
