const mongoose = require('mongoose');
require('dotenv').config();
async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const count = await mongoose.connection.db.collection('contractorworkorders').countDocuments();
  console.log('Total Work Orders:', count);
  process.exit(0);
}
run();
