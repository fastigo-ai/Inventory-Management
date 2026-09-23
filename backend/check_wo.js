const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory-management').then(async () => {
  const db = mongoose.connection.db;
  const wo = await db.collection('contractorworkorders').findOne({ _id: new mongoose.Types.ObjectId('6ab2ceb3adf3db1e37237ff9') });
  console.log("Found WO:", wo ? "Yes" : "No");
  process.exit(0);
});
