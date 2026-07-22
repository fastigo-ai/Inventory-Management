const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const StoreInwardEntry = mongoose.model('StoreInwardEntry');
  const entries = await StoreInwardEntry.find({ invoiceNumber: 'PR-00002' });
  console.log(JSON.stringify(entries, null, 2));
  process.exit(0);
}
run();
