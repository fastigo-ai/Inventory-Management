const mongoose = require('mongoose');
async function check() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority');
  
  const users = await mongoose.connection.db.collection('users').find({
    assignedSubcircle: { $regex: /Nalagarh/i }
  }).toArray();
  
  if (users.length === 0) {
    const storeManagers = await mongoose.connection.db.collection('users').find({
      assignedCircle: { $regex: /Nalagarh/i }
    }).toArray();
    console.log('Store Managers with Nalagarh as circle:', storeManagers);
  } else {
    console.log('Store Managers with Nalagarh as subcircle:', users);
  }

  process.exit(0);
}
check().catch(console.error);
