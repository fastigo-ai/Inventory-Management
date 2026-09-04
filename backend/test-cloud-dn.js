const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const DemandNote = mongoose.connection.collection('demandnotes');
  const dps = await DemandNote.find({}).sort({ createdAt: -1 }).limit(1).toArray();
  
  if (dps.length > 0) {
    const dn = dps[0];
    console.log(`Demand Note: ${dn.demandNoteNumber}`);
    console.log(`Circle: ${dn.circle}`);
    console.log(`Contractor: ${dn.contractorName}`);
    dn.items.slice(0, 3).forEach(item => {
      console.log(`- tempCode: ${item.tempCode}, itemName: ${item.itemName}, activity: ${item.activity}, loaSrNo: ${item.loaSrNo}`);
    });
  } else {
    console.log("No demand notes found.");
  }
  
  process.exit(0);
});
