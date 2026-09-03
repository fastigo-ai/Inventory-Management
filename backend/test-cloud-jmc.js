const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/inventory-management?appName=Cluster0';

mongoose.connect(URI).then(async () => {
  const Jmc = mongoose.connection.collection('jmcregisters');
  const jmcs = await Jmc.find({ status: 'Approved' }).toArray();
  console.log("Approved JMCs:", jmcs.length);
  jmcs.forEach(j => {
    console.log(`JMC: ${j.jmcNumber}, Contractor: ${j.contractorId}, Items: ${j.items.length}`);
    j.items.forEach(i => {
      console.log(`  - Item ID: ${i.itemId}, ApprQty: ${i.approvedQty}, ClaimedQty: ${i.claimedQty}`);
    });
  });
  process.exit(0);
}).catch(console.error);
