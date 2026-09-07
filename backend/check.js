
require('dotenv').config();
const mongoose = require('mongoose');
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const cid = new mongoose.Types.ObjectId('6a6345b98f02b0b289f7ecb6'); 
    
    const items = await db.collection('items').find({ 'dynamicData.loaSrNo': { $in: ['395', '394', '407'] } }).toArray();
    console.log('Items found with loaSrNo 395, 394, 407:', items.length);
    if (items.length > 0) {
      console.log('TempCodes for these:', items.map(i => i.dynamicData?.tempCode).join(', '));
    }
    
    const assignments = await db.collection('contractorassignments').find({ contractorId: cid, 'lineItems.loaSrNo': { $in: ['395', '394', '407'] } }).toArray();
    console.log('Assignments for these loaSrNo:', assignments.length);
    
    const wips = await db.collection('wipregisters').find({ contractorId: cid, 'items.loaSrNo': { $in: ['395', '394', '407'] } }).toArray();
    console.log('WIPs for these loaSrNo:', wips.length);
    
    const jmcs = await db.collection('jmcregisters').find({ contractorId: cid, 'items.loaSrNo': { $in: ['395', '394', '407'] } }).toArray();
    console.log('JMCs for these loaSrNo:', jmcs.length);
    
  } catch(e) { console.error(e) }
  process.exit(0);
};
run();

