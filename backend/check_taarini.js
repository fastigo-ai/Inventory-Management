require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected to DB');

  // Find contractor
  const Contractor = mongoose.model('Contractor', new mongoose.Schema({}, { strict: false }), 'contractors');
  const taarini = await Contractor.findOne({ 
    $or: [
      { name: { $regex: /Taarini/i } },
      { 'dynamicData.displayName': { $regex: /Taarini/i } }
    ]
  });

  if (!taarini) {
    console.log("Could not find Taarini Infratech");
    process.exit(0);
  }
  console.log("Found Contractor:", taarini.name || taarini.dynamicData?.displayName, taarini._id);

  const contractorId = taarini._id;

  // Let's check DemandNotes or WipConsumed for this contractor
  // WipConsumed model
  const WipConsumed = mongoose.model('WipConsumed', new mongoose.Schema({}, { strict: false }), 'wip_consumeds');
  const wipRecords = await WipConsumed.find({ contractorId });
  console.log('Found ' + wipRecords.length + ' WIP Consumed records for this contractor.');
  
  if (wipRecords.length > 0) {
    console.log("Sample WIP Record:");
    console.log(JSON.stringify(wipRecords[0], null, 2));
  }
  
  // Also check demand notes to see "till issued"
  const DemandNote = mongoose.model('DemandNote', new mongoose.Schema({}, { strict: false }), 'demand_notes');
  const dnotes = await DemandNote.find({ contractorId });
  console.log('Found ' + dnotes.length + ' Demand Notes for this contractor.');
  
  if (dnotes.length > 0) {
    let hasZeroIssued = false;
    for (let dn of dnotes) {
      if (dn.items) {
        for (let item of dn.items) {
          if (item.issuedQty === 0 || item.tillIssued === 0) {
            hasZeroIssued = true;
          }
        }
      }
    }
    console.log('Are there items with issuedQty = 0? ' + hasZeroIssued);
    if (hasZeroIssued) {
      console.log("Sample Demand Note with 0 issued:");
      const zeroDn = dnotes.find(dn => dn.items && dn.items.some(i => i.issuedQty === 0 || i.tillIssued === 0 || i.issued === 0));
      if (zeroDn) {
        const i = zeroDn.items.find(i => i.issuedQty === 0 || i.tillIssued === 0 || i.issued === 0);
        console.log('DN: ' + zeroDn.demandNoteNumber + ', Item: ' + JSON.stringify(i));
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
