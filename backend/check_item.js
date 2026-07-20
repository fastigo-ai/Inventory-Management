const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0').then(async () => {
  const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false, collection: 'items' }));
  const items = await Item.find().limit(2);
  console.log(JSON.stringify(items, null, 2));
  process.exit();
}).catch(console.error);
