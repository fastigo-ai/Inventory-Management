require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const ContractorInvoice = mongoose.model('ContractorInvoice', new mongoose.Schema({}, { strict: false }));
  const ci = await ContractorInvoice.findOne({}).lean();
  
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  if (ci && ci.createdBy) {
    const user = await User.findById(ci.createdBy).lean();
    console.log("Creator email:", user?.email);
    console.log("Creator circle:", user?.assignedCircle);
  } else {
    console.log("No createdBy field");
  }
  mongoose.disconnect();
}
main();
