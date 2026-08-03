const mongoose = require('mongoose');
const { StoreInwardEntry } = require('./src/modules/store/storeInwardEntry.schema');

async function check() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  console.log('Connected.');
  
  const docs = await StoreInwardEntry.find({ 
    $or: [
      { circle: { $regex: /nahan/i } },
      { subcircle: { $regex: /nahan/i } },
      { package: { $regex: /nahan/i } }
    ]
  }).limit(5);
  
  console.log('Found:', docs.length);
  if(docs.length > 0) {
    console.log('Sample:', { circle: docs[0].circle, status: docs[0].status });
  }
  
  process.exit(0);
}
check();
