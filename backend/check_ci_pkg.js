require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const ContractorInvoice = mongoose.model('ContractorInvoice', new mongoose.Schema({}, { strict: false }));
  const ci = await ContractorInvoice.findOne({}).lean();
  console.log("ContractorInvoice package:", ci?.package);
  
  mongoose.disconnect();
}
main();
