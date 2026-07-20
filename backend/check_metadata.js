const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0').then(async () => {
  const Metadata = mongoose.model('Metadata', new mongoose.Schema({}, { strict: false, collection: 'metadata' }));
  const metadata = await Metadata.findOne({ entityName: 'Item' });
  console.log(JSON.stringify(metadata, null, 2));
  process.exit();
}).catch(console.error);
