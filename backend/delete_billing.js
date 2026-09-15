require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const nahanUsers = await User.find({ assignedCircle: { $regex: /^nahan$/i } }).select('_id').lean();
  const nahanUserIds = nahanUsers.map(u => u._id);

  const filter = {
    $or: [
      { circle: { $regex: /^nahan$/i } },
      { createdBy: { $in: nahanUserIds } }
    ]
  };

  const ClientBill = mongoose.model('ClientBill', new mongoose.Schema({}, { strict: false }));
  const ClientBillingLedger = mongoose.model('ClientBillingLedger', new mongoose.Schema({}, { strict: false, collection: 'clientbillingledgers' }));
  
  const ContractorInvoice = mongoose.model('ContractorInvoice', new mongoose.Schema({}, { strict: false }));
  const ContractorBillingLedger = mongoose.model('ContractorBillingLedger', new mongoose.Schema({}, { strict: false, collection: 'contractorbillingledgers' }));
  const HandoverCertificate = mongoose.model('HandoverCertificate', new mongoose.Schema({}, { strict: false }));

  const cb = await ClientBill.deleteMany(filter);
  const cbl = await ClientBillingLedger.deleteMany(filter);
  const ci = await ContractorInvoice.deleteMany(filter);
  const cbl2 = await ContractorBillingLedger.deleteMany(filter);
  const ho = await HandoverCertificate.deleteMany(filter);

  console.log(`Deleted ClientBills: ${cb.deletedCount}`);
  console.log(`Deleted ClientBillingLedgers: ${cbl.deletedCount}`);
  console.log(`Deleted ContractorInvoices: ${ci.deletedCount}`);
  console.log(`Deleted ContractorBillingLedgers: ${cbl2.deletedCount}`);
  console.log(`Deleted HandoverCertificates: ${ho.deletedCount}`);
  
  mongoose.disconnect();
}
main();
