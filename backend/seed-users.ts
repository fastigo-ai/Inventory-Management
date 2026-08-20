import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

// Define schemas manually to avoid TS compilation issues if we just run this file with ts-node
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  permissions: [{ type: String }]
}, { timestamps: true });
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  assignedCircle: { type: String }
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    // 1. Create Roles
    let pmRole = await Role.findOne({ name: 'Project Manager' });
    if (!pmRole) {
      pmRole = await Role.create({
        name: 'Project Manager',
        description: 'Manages Demand Notes for a specific circle',
        permissions: ['Project Manager Portal', 'Home']
      });
      console.log('Created Project Manager role');
    }

    let pdRole = await Role.findOne({ name: 'Project Director' });
    if (!pdRole) {
      pdRole = await Role.create({
        name: 'Project Director',
        description: 'Approves Demand Notes across all circles',
        permissions: ['Project Director Portal', 'Home']
      });
      console.log('Created Project Director role');
    }

    // 2. Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);

    let pmUser = await User.findOne({ email: 'pm@airef.com' });
    if (!pmUser) {
      await User.create({
        firstName: 'Project',
        lastName: 'Manager',
        email: 'pm@airef.com',
        password: hashedPassword,
        role: pmRole._id,
        assignedCircle: 'SOLAN' // Sample circle
      });
      console.log('Created Project Manager user: pm@airef.com / password123');
    } else {
      console.log('Project Manager user already exists: pm@airef.com / password123');
    }

    let pdUser = await User.findOne({ email: 'pd@airef.com' });
    if (!pdUser) {
      await User.create({
        firstName: 'Project',
        lastName: 'Director',
        email: 'pd@airef.com',
        password: hashedPassword,
        role: pdRole._id
      });
      console.log('Created Project Director user: pd@airef.com / password123');
    } else {
      console.log('Project Director user already exists: pd@airef.com / password123');
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
