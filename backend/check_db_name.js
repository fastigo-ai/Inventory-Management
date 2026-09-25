const mongoose = require('mongoose');

async function checkUserAndData() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority');
  
  const Division = mongoose.connection.collection('divisions');
  const divs = await Division.find({}).toArray();
  console.log('Divisions in DB:', divs);
  
  process.exit(0);
}
checkUserAndData();
