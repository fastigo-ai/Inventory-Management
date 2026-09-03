const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const Jmc = mongoose.connection.collection('jmcregisters');
  const jmcs = await Jmc.find({}).toArray();
  console.log("Total JMCs in 'test':", jmcs.length);
  process.exit(0);
}).catch(console.error);
