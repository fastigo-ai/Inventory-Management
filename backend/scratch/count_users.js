require('dotenv').config();
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function countUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fastigo-erp');
    const count = await User.countDocuments();
    console.log(`TOTAL_USERS:${count}`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

countUsers();
