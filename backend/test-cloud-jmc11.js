const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const items = await Item.find({ $or: [{ itemName: /ALUMINIUM PAINT/i }, { 'dynamicData.itemName': /ALUMINIUM PAINT/i }] }).toArray();
  console.log(`Found ${items.length} ALUMINIUM PAINT items`);
  items.forEach(i => {
    console.log(`- ID: ${i._id}, pkg: ${i.dynamicData?.package || i.package}, circle: ${i.dynamicData?.circle || i.circle}`);
  });
  process.exit(0);
});
