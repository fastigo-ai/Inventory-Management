const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const pis = await mongoose.connection.db.collection('storeinwardentries').aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
  ]).toArray();
  
  console.log('PI counts by status:');
  console.log(pis);
  
  process.exit(0);
}
run();
