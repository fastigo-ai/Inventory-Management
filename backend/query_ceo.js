const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  const roles = await mongoose.connection.db.collection('roles').find({ name: { $regex: /ceo/i } }).toArray();
  const roleIds = roles.map(r => r._id);
  
  let users = [];
  if (roleIds.length > 0) {
      users = await mongoose.connection.db.collection('users').find({ role: { $in: roleIds } }).toArray();
  } else {
      users = await mongoose.connection.db.collection('users').find({ email: { $regex: /ceo/i } }).toArray();
  }
  
  users.forEach(u => {
      console.log(`User: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
  });
  
  if (users.length === 0) {
      console.log("No CEO users found.");
  }
  
  process.exit(0);
}
run();
