const mongoose = require('mongoose');

async function checkMetadata() {
  try {
    await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
    const db = mongoose.connection.db;
    const metadata = await db.collection('metadata').findOne({ entityName: 'Vendor' });
    if (metadata) {
      console.log(JSON.stringify(metadata.fields.filter(f => f.group === 'Other Details'), null, 2));
    } else {
      console.log('Vendor metadata not found');
    }
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
checkMetadata();
