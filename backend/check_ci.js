require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const ContractorInvoice = mongoose.model('ContractorInvoice', new mongoose.Schema({}, { strict: false }));
  const docs = await ContractorInvoice.find({}).lean();
  console.log("Contractor Invoices:");
  docs.forEach(d => console.log(d.circle));
  
  const ClientBillingLedger = mongoose.model('ClientBillingLedger', new mongoose.Schema({}, { strict: false, collection: 'clientbillingledgers' }));
  const cblCount = await ClientBillingLedger.countDocuments();
  console.log("Total ClientBillingLedgers in DB:", cblCount);

  const ContractorBillingLedger = mongoose.model('ContractorBillingLedger', new mongoose.Schema({}, { strict: false, collection: 'contractorbillingledgers' }));
  const cbl2Count = await ContractorBillingLedger.countDocuments();
  console.log("Total ContractorBillingLedgers in DB:", cbl2Count);

  mongoose.disconnect();
}
main();
