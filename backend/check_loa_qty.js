require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const assignmentSchema = new mongoose.Schema({}, { strict: false });
  const ContractorAssignment = mongoose.models.ContractorAssignment || mongoose.model('ContractorAssignment', assignmentSchema, 'contractorassignments');

  const contractorId = new mongoose.Types.ObjectId('6a6345b98f02b0b289f7ecb6'); // A K Contractor
  const assignments = await ContractorAssignment.find({ contractorId }).lean();
  
  for (const a of assignments) {
      for (const li of a.lineItems) {
          if (li.itemName && li.itemName.toLowerCase().includes('stp 9')) {
              console.log(`Issued: ${li.itemName}, Qty: ${li.quantity}, LOA on MIN: ${li.loaSrNo || 'EMPTY'}, Circle: ${a.circle || 'EMPTY'}`);
          }
      }
  }

  process.exit(0);
});
