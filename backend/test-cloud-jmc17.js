const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const items = await Item.find({ 
    $or: [{ itemName: /ALUMINIUM PAINT/i }, { 'dynamicData.itemName': /ALUMINIUM PAINT/i }],
    $or: [{ activity: /Augmentation/i }, { 'dynamicData.activity': /Augmentation/i }]
  }).toArray();
  
  items.forEach(item => {
    console.log(`Available Aluminum Paint -> tempCode: ${item.dynamicData?.tempCode}, loaSerialNo: ${item.dynamicData?.sku || item.loaSerialNo}, pkg: ${item.dynamicData?.package}, circle: ${item.dynamicData?.circle}`);
  });
  
  process.exit(0);
});
