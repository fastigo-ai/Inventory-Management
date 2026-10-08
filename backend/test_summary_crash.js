const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const { ItemSummary } = require('./src/modules/reports/summary/summary.schema');
  try {
    const res = await ItemSummary.aggregate([
      { $limit: 10 }
    ]);
    console.log("Success item summary limits");
  } catch(e) {
    console.error("Crash", e);
  }
  process.exit(0);
});
