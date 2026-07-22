const mongoose = require('mongoose');
async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0');
  const entries = await mongoose.connection.db.collection('storeinwardentries').find().sort({createdAt: -1}).limit(5).toArray();
  console.log(JSON.stringify(entries, null, 2));
  process.exit(0);
}
run().catch(console.error);
