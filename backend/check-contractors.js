const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const contractors = await mongoose.connection.collection('contractors').find({}).limit(1).toArray();
  console.log(JSON.stringify(contractors[0].dynamicData, null, 2));
  process.exit(0);
});
