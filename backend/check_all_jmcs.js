const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const db = mongoose.connection;
  
  const jmcs = await db.collection('jmcs').find({}).toArray();
  
  console.log(`Total JMCs in DB: ${jmcs.length}`);
  if (jmcs.length > 0) {
    const circles = {};
    jmcs.forEach(j => {
      circles[j.circle] = (circles[j.circle] || 0) + 1;
    });
    console.log("JMCs by circle:", circles);
  }
  
  process.exit(0);
}).catch(console.error);
