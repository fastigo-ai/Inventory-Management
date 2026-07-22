import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from './src/modules/roles/role.model';
import User from './src/modules/users/user.model';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory_db';

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    let superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: 'Super Admin',
        description: 'System Developer Role with full access',
        permissions: ['*']
      });
      console.log('Super Admin role created');
    } else {
      superAdminRole.permissions = ['*'];
      await superAdminRole.save();
      console.log('Super Admin role updated with * permissions');
    }

    // Assign to first user or user with 'admin' in email
    let devUser = await User.findOne({ email: { $regex: /admin/i } });
    
    // Fallback to finding any user if no admin found
    if (!devUser) {
        devUser = await User.findOne({});
    }

    if (devUser) {
      devUser.role = superAdminRole._id as any;
      await devUser.save();
      console.log(`Assigned Super Admin role to user: ${devUser.email}`);
    } else {
      console.log('No user found to assign Super Admin role.');
    }

  } catch (error) {
    console.error('Error seeding super admin role:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
};

seedSuperAdmin();
