const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const item = await db.collection('items').findOne({'dynamicData.name': 'VCB FOUNDATION WORK (5 NOS) AS PER HPSEBL'});
    console.log(item.dynamicData);
    process.exit(0);
  });
