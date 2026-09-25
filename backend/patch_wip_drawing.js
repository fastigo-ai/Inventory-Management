const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const res1 = await db.collection('wipregisters').updateMany(
    { drawingNumber: { $exists: true, $ne: '' } },
    [{ $set: { drawingNo: '$drawingNumber' } }, { $unset: ['drawingNumber'] }]
  );
  console.log('wipregisters migrated:', res1);

  const res2 = await db.collection('wiprequiredregisters').updateMany(
    { drawingNumber: { $exists: true, $ne: '' } },
    [{ $set: { drawingNo: '$drawingNumber' } }, { $unset: ['drawingNumber'] }]
  );
  console.log('wiprequiredregisters migrated:', res2);

  mongoose.disconnect();
});
