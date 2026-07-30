const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const all = await db.collection('metadatas').find().toArray();
    console.log(all.map(a => a.entityName || a.name || a.type));
    const itemMeta = all.find(a => (a.entityName === 'Item' || a.name === 'Item' || a.type === 'Item'));
    if (itemMeta) {
      console.log('Found it!');
      console.log(itemMeta.fields.filter(f => f.name.toLowerCase().includes('solan') || f.name.toLowerCase().includes('loa')));
    }
    process.exit(0);
  });
