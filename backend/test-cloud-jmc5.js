const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const Contractor = mongoose.connection.collection('contractors');
  const all = await Contractor.find({}).toArray();
  console.log("Contractors:", all.map(c => c.name || c.dynamicData?.companyName || c.dynamicData?.name));
  process.exit(0);
}).catch(console.error);
