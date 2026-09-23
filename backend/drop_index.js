const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    const collection = db.collection('contractorworkorders');
    
    // Check if index exists before trying to drop it
    const indexes = await collection.indexes();
    const hasIndex = indexes.some(idx => idx.name === 'workOrderNumber_1');
    
    if (hasIndex) {
      await collection.dropIndex('workOrderNumber_1');
      console.log('Successfully dropped workOrderNumber_1 index');
    } else {
      console.log('Index workOrderNumber_1 does not exist (already dropped?)');
    }
  } catch (err) {
    console.error('Error dropping index:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
