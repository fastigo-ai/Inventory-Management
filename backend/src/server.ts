import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import connectDB from './core/database';
import User from './modules/users/user.model';
import Role from './modules/roles/role.model';
import bcrypt from 'bcrypt';

const PORT = process.env.PORT || 5000;

let server: any;

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

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

    server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed!', err);
  });

process.on('unhandledRejection', (err: any) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down gracefully...');
  console.error(err.name, err.message, err.stack);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('💥 Process terminated!');
    });
  }
});


// AUTO-RELOAD: 2026-08-06T11:46:00