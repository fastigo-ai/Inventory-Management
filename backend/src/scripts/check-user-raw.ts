import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkUserData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const db = mongoose.connection.db;
    const users = await db?.collection('users').find({}).toArray();
    const roles = await db?.collection('roles').find({}).toArray();
    
    if (!users || !roles) {
      process.exit(1);
    }
    
    const roleMap = new Map();
    for (const r of roles) {
      roleMap.set(r._id.toString(), r.name);
    }

    let count = 0;
    for (const u of users) {
      const roleName = u.role ? roleMap.get(u.role.toString()) : 'None';
      if (roleName === 'Store Manager') {
        console.log(`Email: ${u.email}, Circle: "${u.assignedCircle}", Subcircle: "${u.assignedSubcircle}"`);
        count++;
      }
    }
    console.log(`Found ${count} Store Managers`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserData();
