require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testApi() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await mongoose.model('User').findOne({ 'role.name': 'Store Manager' });
  if (!user) {
    console.log("No store manager found");
    process.exit(1);
  }
  
  const token = jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1d' }
  );

  const axios = require('axios');
  try {
    const res = await axios.get('http://localhost:5000/api/store/mhrov/di-items?circle=Nahan', {
      headers: {
        Authorization: \`Bearer \${token}\`,
        Cookie: \`token=\${token}\`
      }
    });
    console.log("SUCCESS:", res.data.data.entries.length, "items");
  } catch (err) {
    console.log("ERROR:", err.response ? err.response.data : err.message);
  }
  process.exit(0);
}
testApi();
