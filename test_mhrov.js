const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/inventory-management-test');
const db = mongoose.connection;
db.once('open', async () => {
  const mhrovs = await db.collection('mhrovs').find({ status: 'Done' }).toArray();
  console.log("Total Done MHROVs:", mhrovs.length);
  if(mhrovs.length > 0) {
    console.log("First MHROV:", mhrovs[0].mhrovNumber);
  }
  process.exit(0);
});
