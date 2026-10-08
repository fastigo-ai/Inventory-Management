const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const result = await mongoose.connection.db.collection('mhrovs').updateMany(
      { circle: { $regex: /^Rampur$/i } },
      { $set: { status: 'Done' } }
  );
  
  console.log(`Matched ${result.matchedCount} MHROV documents for Rampur site.`);
  console.log(`Modified ${result.modifiedCount} MHROV documents to status 'Done'.`);
  
  process.exit(0);
}
run();
