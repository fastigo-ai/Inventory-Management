require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const diCount = await mongoose.model('DI').countDocuments();
  console.log('DI count:', diCount);
  const itemCount = await mongoose.model('Item').countDocuments();
  console.log('Item count:', itemCount);
  process.exit(0);
}
check();
