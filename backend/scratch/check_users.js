require('dotenv').config();
const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const usersColl = db.collection('users');
  
  const user = await usersColl.findOne({ email: /rampur/i });
  console.log('Rampur User:', user ? { email: user.email, assignedCircle: user.assignedCircle, assignedPackage: user.assignedPackage } : 'Not found');
  
  const rohruUser = await usersColl.findOne({ email: /rohru/i });
  console.log('Rohru User:', rohruUser ? { email: rohruUser.email, assignedCircle: rohruUser.assignedCircle, assignedPackage: rohruUser.assignedPackage } : 'Not found');

  mongoose.disconnect();
}
checkData().catch(console.error);
