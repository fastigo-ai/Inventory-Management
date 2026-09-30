require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const result = await db.collection('contractorassignments').deleteMany({
    subcircle: { $in: ['Kumarhatti', 'kumarhatti', 'Kumarhatti '] }
  });
  
  console.log('Deleted Kumarhatti MIN entries count:', result.deletedCount);
  await mongoose.disconnect();
}

run().catch(console.error);
