const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0');
  const vendor = await mongoose.connection.db.collection('vendors').findOne();
  console.log(JSON.stringify(vendor.dynamicData.contactPersons, null, 2));
  console.log(JSON.stringify(vendor.dynamicData.bankDetails, null, 2));
  process.exit(0);
}
run();
