const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.MONGO_URI;

async function deleteAllSolanItems() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');
    const db = mongoose.connection.db;

    // Delete all items where circle includes solan
    const result = await db.collection('items').deleteMany({
      'dynamicData.circle': { $regex: /solan/i }
    });

    console.log(`Deleted ${result.deletedCount} items belonging to the Solan circle.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

deleteAllSolanItems();
