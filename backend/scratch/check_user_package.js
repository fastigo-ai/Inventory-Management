const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    // Check what packages are available in contractor invoices or users
    const user = await db.collection('users').findOne({ email: 'pm.solan@test.com' }) || await db.collection('users').findOne({});
    console.log(`User assigned package: ${user?.assignedPackage}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
