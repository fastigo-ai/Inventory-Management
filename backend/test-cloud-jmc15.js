const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Jmc = mongoose.connection.collection('jmcregisters');
  const ak = await mongoose.connection.collection('contractors').findOne({ $or: [{ name: /A K Contractor/i }, { 'dynamicData.companyName': /A K Contractor/i }] });
  const jmcs = await Jmc.find({ contractorId: ak._id }).toArray();
  
  const map = {};
  jmcs.forEach(jmc => {
    if (jmc.status === 'Approved') {
      jmc.items.forEach(item => {
        const tc = String(item.tempCode || '').trim();
        const loaNo = String(item.loaSerialNo || item.loaSrNo || '').trim();
        const key = `${tc}_${loaNo}`;
        if (!map[key]) map[key] = 0;
        map[key] += (item.approvedQty || item.claimedQty || 0);
      });
    }
  });
  
  console.log("Map for tempCode_loaNo:", Object.keys(map).slice(0, 5).reduce((a, k) => { a[k] = map[k]; return a; }, {}));
  process.exit(0);
});
