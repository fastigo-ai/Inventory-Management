const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const meta = await db.collection('metadatas').findOne({ name: 'Item' });
    console.log(Object.keys(meta || {}));
    if (meta && meta.fields) {
       console.log('Fields count:', meta.fields.length);
       console.log(meta.fields.filter(f => f.name.toLowerCase().includes('solan')));
    } else {
       console.log('No fields in metadata!');
       console.log(meta);
    }
    process.exit(0);
  });
