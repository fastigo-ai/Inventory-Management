const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const item = await mongoose.connection.collection('items').findOne({});
  console.log('Sample item dynamicData keys:', Object.keys(item.dynamicData));
  process.exit();
}).catch(console.error);
