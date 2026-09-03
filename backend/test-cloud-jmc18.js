const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const items = await Item.find({ 
    $or: [{ 'dynamicData.sku': "419" }, { loaSerialNo: "419" }, { loaSrNo: "419" }]
  }).toArray();
  
  items.forEach(item => {
    console.log(`Found item 419 -> name: ${item.dynamicData?.itemName || item.itemName}, tempCode: ${item.dynamicData?.tempCode}, circle: ${item.dynamicData?.circle}`);
  });
  
  process.exit(0);
});
