const mongoose = require('mongoose');
require('dotenv').config();

async function deleteCancelledMins() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');
    
    const db = mongoose.connection.db;
    const collection = db.collection('contractorassignments'); // The exact name depends on mongoose's pluralization, but it's usually lowercase plural. Let's verify.
    
    const count = await collection.countDocuments({ status: 'Cancelled' });
    console.log(`Found ${count} Cancelled MINs in 'contractorassignments'.`);
    
    if (count > 0) {
      const result = await collection.deleteMany({ status: 'Cancelled' });
      console.log(`Successfully deleted ${result.deletedCount} Cancelled MINs.`);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

deleteCancelledMins();
