const mongoose = require('mongoose');
const { WipRequiredRegister } = require('./dist/modules/wip-required/wipRequired.schema.js');

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  try {
    const regex = new RegExp(`^nahan$`, 'i');
    
    // Check how many match
    const count = await WipRequiredRegister.countDocuments({ circle: { $regex: regex } });
    console.log(`Found ${count} WipRequiredRegister records for Nahan circle.`);
    
    // Update them
    const result = await WipRequiredRegister.updateMany(
      { circle: { $regex: regex } },
      { $set: { package: 'Package 1(S/N)' } }
    );
    
    console.log(`Successfully updated ${result.modifiedCount} records.`);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
});
