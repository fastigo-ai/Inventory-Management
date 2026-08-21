require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await mongoose.connection.collection('users').findOne({ email: 'pm@airef.com' });
  const role = await mongoose.connection.collection('roles').findOne({ _id: user.role });
  
  const tokenPayload = {
    id: user._id,
    email: user.email,
    role: { id: role._id, name: role.name },
    sessionVersion: user.sessionVersion,
    assignedPackage: user.assignedPackage,
    assignedCircle: user.assignedCircle
  };
  
  const token = jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: '1d' });
  
  try {
    const res = await axios.get('http://localhost:5000/api/demand-notes', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Success! Found ${res.data.data.demandNotes.length} demand notes for PM.`);
    console.log(res.data.data.demandNotes.map(d => ({ dn: d.demandNoteNumber, status: d.status, circle: d.circle, package: d.package })));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
  process.exit(0);
}
run();
