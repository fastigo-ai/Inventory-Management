
require('dotenv').config();
const mongoose = require('mongoose');
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const jmcs = await db.collection('jmcregisters').find({}).sort({createdAt: -1}).limit(2).toArray();
    console.log(JSON.stringify(jmcs, null, 2));
  } catch(e) { console.error(e) }
  process.exit(0);
};
run();

