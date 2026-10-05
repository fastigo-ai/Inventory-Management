require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const usersColl = db.collection('users');
  
  const user = await usersColl.findOne({ email: 'Rampursite@gmail.com' });
  console.log('Rampursite User:', user ? { email: user.email, assignedCircle: user.assignedCircle, assignedPackage: user.assignedPackage } : 'Not found');
  
  mongoose.disconnect();
}
checkData().catch(console.error);
