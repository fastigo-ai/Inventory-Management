const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0').then(async () => {
  const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }));
  const items = await Item.find({ "dynamicData.name": /Providing Cement Concreting/i }).lean();
  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
});
