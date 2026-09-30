require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const result = await db.collection('storeinwardentries').deleteMany({
    invoiceNumber: 'HISTORICAL',
    subcircle: { $in: ['Nalagarh', 'Kumarhatti', 'Nalagarh ', 'Kumarhatti ', 'nalagarh', 'kumarhatti'] }
  });
  
  // They also have vendorName: 'Historical Opening Balance'
  const result2 = await db.collection('storeinwardentries').deleteMany({
    vendorName: 'Historical Opening Balance',
    subcircle: { $in: ['Nalagarh', 'Kumarhatti', 'Nalagarh ', 'Kumarhatti ', 'nalagarh', 'kumarhatti'] }
  });
  
  console.log('Deleted historical inward entries count (by invoiceNumber):', result.deletedCount);
  console.log('Deleted historical inward entries count (by vendorName):', result2.deletedCount);
  await mongoose.disconnect();
}

run().catch(console.error);
