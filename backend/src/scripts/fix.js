const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0')
.then(async () => {
  const Vendor = mongoose.connection.db.collection('vendors');
  await Vendor.updateMany(
    { 'dynamicData.displayName': 'Select or type to add' },
    { $set: { 'dynamicData.displayName': 'Fastigo Technology Pvt Ltd' } }
  );
  
  const Metadata = mongoose.connection.db.collection('metadata');
  const metadata = await Metadata.findOne({ entityName: 'Vendor' });
  if (metadata) {
    metadata.fields.forEach(f => {
      if (f.name === 'displayName') {
        f.type = 'text';
        delete f.options;
      }
    });
    await Metadata.updateOne({ _id: metadata._id }, { $set: { fields: metadata.fields } });
  }
  console.log('Fixed vendor display name and metadata!');
  process.exit(0);
});
