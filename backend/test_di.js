const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const DI = require('./src/modules/di/di.schema').DI;
  const item = await DI.findOne().lean();
  console.log(item);
  process.exit(0);
});
