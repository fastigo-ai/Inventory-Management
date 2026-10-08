const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/inventory-app').then(async () => {
  const item = await mongoose.connection.collection('items').findOne({});
  console.log(item.dynamicData);
  process.exit();
});
