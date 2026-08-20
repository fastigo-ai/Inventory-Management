require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const axios = require('axios');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findOne();
  if (!user) return console.log('No user');
  
  const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });
  try {
    const res = await axios.get('http://localhost:5000/api/store/transfers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    console.log('Data size:', JSON.stringify(res.data).length);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response body:', err.response.data);
    }
  }
  process.exit(0);
}
test();
