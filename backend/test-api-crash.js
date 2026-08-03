const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findOne();
  if (!user) return console.log('No user');
  
  const token = jwt.sign(
    { id: user._id, email: user.email, sessionVersion: user.sessionVersion },
    'super_secret_access_jwt_key'
  );
  
  try {
    const res = await axios.get('http://localhost:5000/api/purchases/invoices?page=1&limit=50', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success:", res.status);
  } catch (err) {
    console.log("Error:", err.message);
    if(err.response) console.log(err.response.data);
  }
  process.exit();
}
test();
