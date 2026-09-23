const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const db = mongoose.connection;
  const mhrovs = await db.collection('mhrovs').find({}).toArray();
  console.log("Total MHROVs:", mhrovs.length);
  const statuses = {};
  mhrovs.forEach(m => {
    statuses[m.status] = (statuses[m.status] || 0) + 1;
  });
  console.log("Statuses:", statuses);
  process.exit(0);
}).catch(console.error);
