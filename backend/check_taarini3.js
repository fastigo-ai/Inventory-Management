require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // get all collections
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    try {
      const docs = await collection.find({ $or: [ 
        { name: { $regex: /Taarini/i } },
        { 'dynamicData.displayName': { $regex: /Taarini/i } },
        { 'contractorName': { $regex: /Taarini/i } },
        { 'clientName': { $regex: /Taarini/i } }
      ]}).toArray();
      if (docs.length > 0) {
        console.log('Found ' + docs.length + ' docs in collection ' + collection.collectionName);
      }
    } catch (e) {
      // ignore
    }
  }

  process.exit(0);
}

run().catch(console.error);
