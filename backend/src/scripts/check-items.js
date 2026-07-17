const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const collection = mongoose.connection.db.collection('metadata');
  const metadata = await collection.findOne({});
  console.log(JSON.stringify(metadata, null, 2));
  process.exit(0);
}).catch(console.error);
