const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const roles = await mongoose.connection.db.collection('roles').find({ name: { $in: ['Billing Engineer', 'HO Billing Engineer', 'Quantity Surveyor'] } }).toArray();
  
  roles.forEach(r => {
      console.log(`Role: ${r.name}`);
      console.log(`Permissions: ${r.permissions.join(', ')}`);
  });
  
  process.exit(0);
}
run();
