const mongoose = require('mongoose');
const { WipRegister } = require('./dist/modules/wip/wip.schema.js');

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  try {
    const wips = await WipRegister.find({}).limit(5).populate('contractorId');
    console.log(`Found ${wips.length} WIP records.`);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
});
