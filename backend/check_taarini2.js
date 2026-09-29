require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const Contractor = mongoose.model('Contractor', new mongoose.Schema({}, { strict: false }), 'contractors');
  const taarini = await Contractor.findOne({ 
    $or: [
      { name: { $regex: /Taarini/i } },
      { 'dynamicData.displayName': { $regex: /Taarini/i } }
    ]
  });

  if (!taarini) {
    console.log("Could not find Taarini");
    process.exit(0);
  }
  
  const contractorId = taarini._id;

  const ContractorWorkOrder = mongoose.model('ContractorWorkOrder', new mongoose.Schema({}, { strict: false }), 'contractor_work_orders');
  const wos = await ContractorWorkOrder.find({ contractorId });
  console.log('Found ' + wos.length + ' Work Orders for Taarini');
  if (wos.length > 0) {
    // Check if the WIP Consumed references workOrderId instead of contractorId
    const WipConsumed = mongoose.model('WipConsumed', new mongoose.Schema({}, { strict: false }), 'wip_consumeds');
    for (let wo of wos) {
      const wips = await WipConsumed.find({ workOrderId: wo._id });
      console.log('WO ' + wo.workOrderNumber + ' has ' + wips.length + ' WIP Consumed records');
      if (wips.length > 0) {
        console.log(JSON.stringify(wips[0], null, 2));
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
