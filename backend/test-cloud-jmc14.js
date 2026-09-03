const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Jmc = mongoose.connection.collection('jmcregisters');
  const ak = await mongoose.connection.collection('contractors').findOne({ $or: [{ name: /A K Contractor/i }, { 'dynamicData.companyName': /A K Contractor/i }] });
  const jmcs = await Jmc.find({ contractorId: ak._id }).toArray();
  
  jmcs.forEach(jmc => {
    if (jmc.status === 'Approved') {
       console.log(jmc.items.filter(i => (i.claimedQty || i.approvedQty || i.quantity || i.amount)).slice(0, 3));
    }
  });
  process.exit(0);
});
