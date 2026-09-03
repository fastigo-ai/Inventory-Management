const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const item = await Item.findOne({ 
    $or: [{ 'dynamicData.sku': "419" }, { loaSerialNo: "419" }, { loaSrNo: "419" }]
  });
  
  if (item) {
    console.log(`Item 419 Activity in DB: ${item.dynamicData?.activity || item.activity}`);
  } else {
    console.log("Item 419 not found in Items collection!");
  }
  
  process.exit(0);
});
