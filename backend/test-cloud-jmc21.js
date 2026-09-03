const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const nahanItems = await Item.find({ 
    $or: [{ circle: /Nahan/i }, { 'dynamicData.circle': /Nahan/i }]
  }).toArray();
  const nahanActs = [...new Set(nahanItems.map(i => i.dynamicData?.activity || i.activity))].filter(Boolean).sort();
  
  console.log(nahanActs.filter(a => a.toLowerCase().includes('11kv')));
  process.exit(0);
});
