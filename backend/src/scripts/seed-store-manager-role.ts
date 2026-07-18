import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../modules/roles/role.model';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to DB');

    const roleExists = await Role.findOne({ name: 'Store Manager' });
    if (roleExists) {
      console.log('Store Manager role already exists!');
    } else {
      await Role.create({
        name: 'Store Manager',
        permissions: ['store:read', 'store:write', 'di:read']
      });
      console.log('Store Manager role created successfully!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed role:', error);
    process.exit(1);
  }
};

seedRole();
