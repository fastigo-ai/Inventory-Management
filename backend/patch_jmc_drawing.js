const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const res = await db.collection('jmcregisters').updateMany(
    { drawingNumber: { $exists: true, $ne: '' } },
    [{ $set: { drawingNo: '$drawingNumber' } }, { $unset: ['drawingNumber'] }]
  );
  console.log(res);
  mongoose.disconnect();
});
