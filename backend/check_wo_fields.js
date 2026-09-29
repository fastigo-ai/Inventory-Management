require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const CWO = mongoose.model('CWO', new mongoose.Schema({}, { strict: false }), 'contractor_work_orders');
  const wos = await CWO.find({}).limit(5);
  
  if (wos.length > 0) {
    for (let wo of wos) {
      if (wo.items && wo.items.length > 0) {
        console.log("WO item fields:");
        const item = wo.items[0];
        console.log(Object.keys(item).join(', '));
        console.log(item);
        break;
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
