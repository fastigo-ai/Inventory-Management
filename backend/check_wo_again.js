const mongoose = require('mongoose');
require('dotenv').config();
async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const wo = await mongoose.connection.db.collection('contractorworkorders').findOne({ _id: new mongoose.Types.ObjectId('6ab2ceb3adf3db1e37237ff9') });
  console.log('Exists?', !!wo);
  if (wo) {
    console.log('Status:', wo.handoverStatus);
  }
  process.exit(0);
}
run();
