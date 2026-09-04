const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const axios = require('axios');
  const ak = await mongoose.connection.collection('contractors').findOne({ $or: [{ name: /A K Contractor/i }, { 'dynamicData.companyName': /A K Contractor/i }] });
  console.log("Contractor ID:", ak._id);
  
  try {
    const res = await axios.get(`http://localhost:5000/api/v1/ho-billing/contractor-work-orders?contractorId=${ak._id}`);
    console.log("Response data:", res.data);
  } catch (err) {
    console.log("Axios error:", err.message);
  }
  
  process.exit(0);
});
