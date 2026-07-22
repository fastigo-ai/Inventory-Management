const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const adminDb = mongoose.connection.db.admin();
  const dbs = await adminDb.listDatabases();
  console.log(dbs.databases.map(db => db.name).join(', '));
  process.exit(0);
}

run();
