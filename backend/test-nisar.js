
require('dotenv').config();
const mongoose = require('mongoose');
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Find contractor
    const searchRegex = new RegExp('^Nisar Mohd$', 'i');
    const c = await db.collection('contractors').findOne({
      \\\: [
        { 'dynamicData.companyName': { \\\: searchRegex } },
        { 'dynamicData.displayName': { \\\: searchRegex } },
        { 'name': { \\\: searchRegex } }
      ]
    });
    console.log('Contractor found:', c?.dynamicData?.displayName || c?.name);
    
    if (c) {
      const cid = c._id;
      const assignments = await db.collection('contractorassignments').find({ contractorId: cid }).toArray();
      console.log('Assignments count for Nisar Mohd:', assignments.length);
      
      const wips = await db.collection('wipregisters').find({ contractorId: cid }).toArray();
      console.log('WIPs count for Nisar Mohd:', wips.length);
      
      const jmcs = await db.collection('jmcregisters').find({ contractorId: cid }).toArray();
      console.log('JMCs count for Nisar Mohd:', jmcs.length);
    } else {
      console.log('Contractor NOT FOUND in DB!');
    }
  } catch(e) { console.error(e) }
  process.exit(0);
};
run();

