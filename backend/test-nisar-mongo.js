require('dotenv').config();
const { MongoClient } = require('mongodb');
const run = async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    
    // Find contractor Nisar Mohd
    const c = await db.collection('contractors').findOne({
      $or: [
        { 'dynamicData.companyName': { $regex: '^Nisar Mohd$', $options: 'i' } },
        { 'dynamicData.displayName': { $regex: '^Nisar Mohd$', $options: 'i' } },
        { 'name': { $regex: '^Nisar Mohd$', $options: 'i' } }
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
  } catch(e) { console.error(e) } finally {
    await client.close();
  }
};
run();
