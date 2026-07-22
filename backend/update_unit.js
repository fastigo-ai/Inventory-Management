const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0');
  const db = mongoose.connection.db;
  const itemMeta = await db.collection('metadatas').findOne({ entityName: 'Item' });
  
  if (itemMeta) {
    const updatedFields = itemMeta.fields.map(f => {
      if (f.name === 'unit') {
        f.type = 'text';
        delete f.options;
      }
      return f;
    });
    
    await db.collection('metadatas').updateOne(
      { entityName: 'Item' },
      { $set: { fields: updatedFields } }
    );
    console.log('Successfully updated Unit field to text in the DB.');
  } else {
    console.log('Item metadata not found in DB.');
  }
  process.exit(0);
}

run();
