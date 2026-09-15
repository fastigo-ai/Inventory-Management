import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../modules/users/user.model';
import Role from '../modules/roles/role.model'; // import role to avoid missing schema error

async function checkUserData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    const users = await User.find({ "role": { $exists: true } }).populate('role');
    const storeManagers = users.filter((u: any) => u.role?.name === 'Store Manager');
    
    console.log(`Found ${storeManagers.length} Store Managers`);
    for (const sm of storeManagers) {
      console.log(`Email: ${sm.email}, Circle: ${sm.assignedCircle}, Subcircle: ${sm.assignedSubcircle}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserData();
