const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const Contractor = mongoose.connection.collection('contractors');
  const ak = await Contractor.findOne({ $or: [{ name: /A K Contractor/i }, { 'dynamicData.companyName': /A K Contractor/i }] });
  
  if (ak) {
    const Jmc = mongoose.connection.collection('jmcregisters');
    const jmcs = await Jmc.find({ contractorId: ak._id }).toArray();
    console.log("Total JMCs for A K Contractor:", jmcs.length);
    let totalApprovedItems = 0;
    const map = {};
    jmcs.forEach(jmc => {
      if (jmc.status === 'Approved' && jmc.items) {
        totalApprovedItems += jmc.items.length;
        jmc.items.forEach(item => {
          if (item.itemId) {
            const id = item.itemId.toString();
            if (!map[id]) map[id] = 0;
            map[id] += (item.approvedQty || item.claimedQty || 0);
          }
        });
      }
    });
    console.log("Total Approved Items:", totalApprovedItems);
    console.log("JMC Map (first 5 keys):", Object.keys(map).slice(0, 5).reduce((acc, key) => { acc[key] = map[key]; return acc; }, {}));
  }
  process.exit(0);
}).catch(console.error);
