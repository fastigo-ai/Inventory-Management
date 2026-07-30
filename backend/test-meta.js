const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const meta = await db.collection('entitymetadatas').findOne({ name: 'Item' });
    console.log(JSON.stringify(meta?.fields?.filter(f => f.label.includes('LOA')), null, 2));
    process.exit(0);
  });
