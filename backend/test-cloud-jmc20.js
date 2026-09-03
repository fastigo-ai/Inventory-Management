const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const nahanItems = await Item.find({ 
    $or: [{ circle: /Nahan/i }, { 'dynamicData.circle': /Nahan/i }]
  }).toArray();
  const solanItems = await Item.find({ 
    $or: [{ circle: /Solan/i }, { 'dynamicData.circle': /Solan/i }]
  }).toArray();
  
  const nahanActs = [...new Set(nahanItems.map(i => i.dynamicData?.activity || i.activity))].filter(Boolean).sort();
  const solanActs = [...new Set(solanItems.map(i => i.dynamicData?.activity || i.activity))].filter(Boolean).sort();
  
  console.log("Nahan Activities include '11kv New Line on STP':", nahanActs.some(a => a.includes('11kv New Line on STP')));
  console.log("Solan Activities include '11kv New Line on STP':", solanActs.some(a => a.includes('11kv New Line on STP')));
  console.log("Solan Activities:", solanActs.slice(0, 5));
  
  process.exit(0);
});
