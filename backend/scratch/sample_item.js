const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0?retryWrites=true&w=majority').then(async () => {
  const sum = mongoose.connection.collection('itemsummaries');
  const items = await sum.aggregate([{ $limit: 1 }]).toArray();
  console.log(items);
  process.exit(0);
});
