const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const items = await Item.find({ 
    $or: [{ 'dynamicData.tempCode': "93" }, { tempCode: "93" }],
    $or: [{ circle: /Nahan/i }, { 'dynamicData.circle': /Nahan/i }]
  }).toArray();
  
  console.log(`Found ${items.length} items with tempCode 93 in Nahan`);
  items.forEach(i => {
    console.log(`- loaSrNo: ${i.dynamicData?.sku || i.loaSrNo || i.loaSerialNo}, activity: ${i.dynamicData?.activity || i.activity}`);
  });
  
  process.exit(0);
});
