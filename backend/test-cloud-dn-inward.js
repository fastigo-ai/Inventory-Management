const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Inward = mongoose.connection.collection('storeinwardentries');
  const inwards = await Inward.find({ tempCode: "93" }).toArray();
  console.log(`Found ${inwards.length} inward entries for tempCode 93`);
  
  const allInwards = await Inward.find({}).limit(5).toArray();
  console.log("Sample inwards tempCodes:", allInwards.map(i => i.tempCode));
  process.exit(0);
});
