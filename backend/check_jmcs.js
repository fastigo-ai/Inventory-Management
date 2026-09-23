const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const db = mongoose.connection;
  
  // Check JMC documents
  const jmcs = await db.collection('jmcs').find({ 
    circle: { $regex: /solan/i } 
  }).toArray();
  
  console.log(`Total JMCs in Solan: ${jmcs.length}`);
  
  // Show a few to understand structure
  if (jmcs.length > 0) {
    console.log("First JMC structure:", JSON.stringify(jmcs[0], null, 2));
  }
  
  process.exit(0);
}).catch(console.error);
