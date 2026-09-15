require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const ClientBill = mongoose.model('ClientBill', new mongoose.Schema({}, { strict: false }));
  const ClientBillingLedger = mongoose.model('ClientBillingLedger', new mongoose.Schema({}, { strict: false, collection: 'clientbillingledgers' }));
  
  const ContractorInvoice = mongoose.model('ContractorInvoice', new mongoose.Schema({}, { strict: false }));
  const ContractorBillingLedger = mongoose.model('ContractorBillingLedger', new mongoose.Schema({}, { strict: false, collection: 'contractorbillingledgers' }));
  const HandoverCertificate = mongoose.model('HandoverCertificate', new mongoose.Schema({}, { strict: false }));

  const filter = { circle: { $regex: /^nahan$/i } };
  
  const cbCount = await ClientBill.countDocuments(filter);
  const cblCount = await ClientBillingLedger.countDocuments(filter); // Ledger might not have 'circle', let's check
  
  const ciCount = await ContractorInvoice.countDocuments(filter);
  const cbl2Count = await ContractorBillingLedger.countDocuments(filter);
  const hoCount = await HandoverCertificate.countDocuments(filter);

  console.log("--- NAHAN CIRCLE COUNTS ---");
  console.log("ClientBill:", cbCount);
  console.log("ClientBillingLedger:", cblCount);
  console.log("ContractorInvoice:", ciCount);
  console.log("ContractorBillingLedger:", cbl2Count);
  console.log("HandoverCertificate:", hoCount);
  
  mongoose.disconnect();
}
main();
