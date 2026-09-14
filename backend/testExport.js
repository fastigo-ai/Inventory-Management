const mongoose = require('mongoose');
const { ContractorAssignment } = require('./dist/modules/contractors/contractorAssignment.schema.js');

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const filter = {};
  const assignments = await ContractorAssignment.find(filter)
    .populate('contractorId', 'name farmName companyName dynamicData')
    .sort({ date: -1 })
    .limit(5);
    
  console.log(`Found ${assignments.length} assignments.`);
  
  if (assignments.length > 0) {
    console.log("LineItems in first:", assignments[0].lineItems.length);
    console.log("First item:", assignments[0].lineItems[0].itemName);
  }
  process.exit(0);
});
