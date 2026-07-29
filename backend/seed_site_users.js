const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const Role = mongoose.models.Role || mongoose.model('Role', new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
  }, { timestamps: true }));

  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    sessionVersion: { type: Number, default: 0 },
    assignedPackage: { type: String },
    assignedCircle: { type: String },
  }, { timestamps: true }));

  console.log('Seeding Site Manager role...');
  let siteManagerRole = await Role.findOne({ name: 'Site Manager' });
  if (!siteManagerRole) {
    siteManagerRole = await Role.create({
      name: 'Site Manager',
      description: 'Site Manager for Site Portal',
      permissions: ['Site Portal', 'Site Management']
    });
    console.log('Created Site Manager role.');
  } else {
    console.log('Site Manager role already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password123!', salt);

  const users = [
    { firstName: 'Amit', lastName: 'Sharma', email: 'amit.sharma@example.com', assignedPackage: 'Package 1 (S/N)', assignedCircle: 'Nahan' },
    { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.kumar@example.com', assignedPackage: 'Package 1 (S/N)', assignedCircle: 'Solan' },
    { firstName: 'Sandeep', lastName: 'Singh', email: 'sandeep.singh@example.com', assignedPackage: 'Package 2', assignedCircle: 'Nahan' },
    { firstName: 'Vikram', lastName: 'Patel', email: 'vikram.patel@example.com', assignedPackage: 'Package 2', assignedCircle: 'Solan' }
  ];

  console.log('Seeding 4 Site Manager users...');
  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create({
        ...u,
        password: hashedPassword,
        role: siteManagerRole._id
      });
      console.log(`Created user: ${u.email}`);
    } else {
      console.log(`User already exists: ${u.email}`);
    }
  }

  console.log('Successfully seeded site users!');
  mongoose.disconnect();
}

run().catch(console.error);
