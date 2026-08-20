const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const Contractor = mongoose.model('Contractor', new mongoose.Schema({}, { strict: false }));
  const Jmc = mongoose.model('JmcRegister', new mongoose.Schema({}, { strict: false }));
  const Wip = mongoose.model('WipRegister', new mongoose.Schema({}, { strict: false }));
  const WipReq = mongoose.model('WipRequiredRegister', new mongoose.Schema({}, { strict: false }));

  const contractor = await Contractor.findOne({ "dynamicData.companyName": "A K Contractor" });
  if (!contractor) {
    console.log("Contractor not found");
    process.exit(0);
  }
  
  console.log("Contractor ID:", contractor._id.toString());
  
  const jmcs = await Jmc.find({ contractorId: contractor._id });
  const wips = await Wip.find({ contractorId: contractor._id });
  const wipReqs = await WipReq.find({ contractorId: contractor._id });
  
  console.log("JMCs count:", jmcs.length);
  console.log("WIPs count:", wips.length);
  console.log("WIP Reqs count:", wipReqs.length);
  
  if (jmcs.length > 0) {
    const items = [...jmcs, ...wips, ...wipReqs].flatMap(j => j.get('items')); console.log("Items matching 1866:", JSON.stringify(items.filter(i => i.loaSerialNo === "1866" || i.loaSrNo === "1866"), null, 2));
  }
  
  process.exit(0);
}

check().catch(console.error);
