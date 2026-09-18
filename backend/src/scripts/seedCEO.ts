import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Role from '../modules/roles/role.model';
import User from '../modules/users/user.model';

async function seedCEO() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected to Database.');

    // 1. Create or Update CEO Role
    let ceoRole = await Role.findOne({ name: 'CEO' });
    if (!ceoRole) {
      ceoRole = new Role({
        name: 'CEO',
        permissions: ['*'], // Or specifically ['CEO Portal', 'Reports', 'Dashboard', 'Site Portal', 'Project Manager Portal']
        description: 'Chief Executive Officer with full analytical access'
      });
      await ceoRole.save();
      console.log('CEO Role created.');
    } else {
      if (!ceoRole.permissions.includes('*')) {
        ceoRole.permissions = ['*'];
        await ceoRole.save();
      }
      console.log('CEO Role already exists.');
    }

    // 2. Create CEO User
    const email = 'ceo@projectflow.com';
    let ceoUser = await User.findOne({ email });
    if (!ceoUser) {
      const hashedPassword = await bcrypt.hash('ProjectFlow@2025', 10);
      ceoUser = new User({
        firstName: 'Snahangshu',
        lastName: 'Mallik',
        email: email,
        password: hashedPassword,
        role: ceoRole._id,
        assignedPackage: 'All',
        assignedCircle: 'All'
      });
      await ceoUser.save();
      console.log('CEO User created successfully.');
      console.log('Email:', email);
      console.log('Password:', 'ProjectFlow@2025');
    } else {
      console.log('CEO User already exists.');
    }

  } catch (error) {
    console.error('Error seeding CEO:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from Database.');
    process.exit(0);
  }
}

seedCEO();
