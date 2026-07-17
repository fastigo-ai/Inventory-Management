import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import connectDB from './core/database';
import User from './modules/users/user.model';
import Role from './modules/roles/role.model';
import bcrypt from 'bcrypt';

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    // Auto-seed admin user for production deployments
    try {
      const adminExists = await User.findOne({ email: 'admin@admin.com' });
      if (!adminExists) {
        let superAdminRole = await Role.findOne({ name: 'Super Admin' });
        if (!superAdminRole) {
          superAdminRole = await Role.create({
            name: 'Super Admin',
            description: 'System Administrator with full access',
            permissions: ['*']
          });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        await User.create({
          firstName: 'System',
          lastName: 'Admin',
          email: 'admin@admin.com',
          password: hashedPassword,
          role: superAdminRole._id
        });
        console.log('Auto-seeded default admin@admin.com account');
      }
    } catch (e) {
      console.error('Failed to auto-seed admin', e);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed!', err);
  });
