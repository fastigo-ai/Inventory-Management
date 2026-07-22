const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(collections.map(c => c.name).join(', '));
  process.exit(0);
}

run();
