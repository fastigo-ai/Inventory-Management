import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Role from '../modules/roles/role.model';
import User from '../modules/users/user.model';

// Load env vars
dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_system';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if Super Admin role exists
    let superAdminRole = await Role.findOne({ name: 'Super Admin' });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: 'Super Admin',
        description: 'System Administrator with full access',
        permissions: ['*'] // Wildcard gives access to everything
      });
      console.log('Super Admin role created');
    } else {
      console.log('Super Admin role already exists');
    }

    // Check if admin user exists
    const adminEmail = 'admin@admin.com';
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      adminUser = await User.create({
        firstName: 'System',
        lastName: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: superAdminRole._id
      });
      console.log('Admin user created: admin@admin.com / admin123');
    } else {
      console.log('Admin user already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedAdmin();
