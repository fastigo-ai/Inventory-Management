const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const { Contractor } = require('./src/modules/contractors/contractor.schema');
  const c = await Contractor.findOne();
  console.log(JSON.stringify(c, null, 2));
  process.exit(0);
}).catch(console.error);
