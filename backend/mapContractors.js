const mongoose = require('mongoose');
const { Contractor } = require('./dist/modules/contractors/contractor.schema.js');
const { JmcRegister } = require('./dist/modules/jmc/jmc.schema.js');
const { WipRegister } = require('./dist/modules/wip/wip.schema.js');
const { WipRequiredRegister } = require('./dist/modules/wip-required/wipRequired.schema.js');

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  try {
    const all = await Contractor.find({});
    for (const c of all) {
      const cId = c._id;
      // find circle from JMC, WIP, WIP Req
      const jmc = await JmcRegister.findOne({ contractorId: cId });
      const wip = await WipRegister.findOne({ contractorId: cId });
      const wipreq = await WipRequiredRegister.findOne({ contractorId: cId });
      
      const circles = new Set();
      if (jmc && jmc.circle) circles.add(jmc.circle);
      if (wip && wip.circle) circles.add(wip.circle);
      if (wipreq && wipreq.circle) circles.add(wipreq.circle);
      
      if (circles.size > 0) {
        const primaryCircle = Array.from(circles)[0];
        console.log(`Mapping ${c.name || c.dynamicData?.companyName} to ${primaryCircle}`);
        await Contractor.findByIdAndUpdate(cId, { location: primaryCircle });
      }
    }
    console.log('Done mapping.');
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
});
