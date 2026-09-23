const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Define schema directly to avoid import issues
const Schema = mongoose.Schema;
const JmcRegisterSchema = new Schema({}, { strict: false, collection: 'jmcregisters' });
const JmcRegister = mongoose.model('JmcRegister', JmcRegisterSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db');
  const jmc = await JmcRegister.findOne({ 'items.0': { $exists: true } });
  if (jmc) {
    console.log(JSON.stringify(jmc.items, null, 2));
  } else {
    console.log("No JMCs with items found");
  }
  process.exit(0);
}
run();
