const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(collections.map(c => c.name));
    const metaCollection = collections.find(c => c.name.toLowerCase().includes('metadata'));
    if (metaCollection) {
      const meta = await db.collection(metaCollection.name).findOne({ name: 'Item' });
      console.log('Fields:', meta?.fields?.length);
      console.log(meta?.fields?.filter(f => f.name.toLowerCase().includes('solan') || f.name.toLowerCase().includes('loa')));
    }
    process.exit(0);
  });
