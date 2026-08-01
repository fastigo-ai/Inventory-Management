const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const withFalse = await db.collection('items').aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]).toArray();
    
    const withNeTrue = await db.collection('items').aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]).toArray();
    
    console.log("Count with isDeleted: false ->", withFalse);
    console.log("Count with isDeleted: { $ne: true } ->", withNeTrue);
    process.exit(0);
  })
  .catch(console.error);
