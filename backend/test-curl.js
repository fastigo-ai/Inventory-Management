const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = mongoose.connection.collection('users');
  const Role = mongoose.connection.collection('roles');
  const pmRole = await Role.findOne({ name: 'Project Manager' });
  const pm = await User.findOne({ role: pmRole._id });
  
  // Create a JWT token manually to call the local endpoint
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: pm._id, role: pmRole.name }, process.env.JWT_SECRET || 'fallback', { expiresIn: '1d' });
  
  try {
    const res = await axios.get('http://localhost:5000/api/v1/dashboard/pm-portal-summary', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.log("Error:", e.response?.data || e.message);
  }
  process.exit(0);
});
