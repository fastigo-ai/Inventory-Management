const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const colls = await mongoose.connection.db.listCollections().toArray();
  console.log(colls.map(c => c.name));
  process.exit(0);
});
