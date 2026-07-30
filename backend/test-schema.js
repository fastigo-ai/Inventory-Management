const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const items = await db.collection('items').find().limit(5).toArray();
    for (let item of items) {
      console.log('Item Keys:', Object.keys(item.dynamicData || {}));
    }
    process.exit(0);
  });
