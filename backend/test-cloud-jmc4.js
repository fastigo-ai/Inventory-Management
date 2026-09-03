const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const Contractor = mongoose.connection.collection('contractors');
  const ak = await Contractor.findOne({ name: /A K Contractor/i });
  console.log("Contractor ID:", ak ? ak._id : 'Not Found');
  
  if (ak) {
    const Jmc = mongoose.connection.collection('jmcregisters');
    const jmcs = await Jmc.find({ contractorId: ak._id, status: 'Approved' }).toArray();
    console.log("Approved JMCs for A K Contractor:", jmcs.length);
  }
  process.exit(0);
}).catch(console.error);
