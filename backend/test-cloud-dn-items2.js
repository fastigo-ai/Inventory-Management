const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const items = await Item.find({ 
    $or: [{ 'dynamicData.tempCode': "93" }, { tempCode: "93" }]
  }).toArray();
  
  const names = [...new Set(items.map(i => i.dynamicData?.itemName || i.itemName))];
  console.log("Unique Item Names for tempCode 93:");
  console.log(names);
  
  process.exit(0);
});
