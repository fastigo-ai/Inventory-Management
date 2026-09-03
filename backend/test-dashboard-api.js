const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
// Load models
require('./dist/modules/client-billing/clientBill.schema.js');
require('./dist/modules/di/di.schema.js'); // Assuming DemandNote/WipRegister etc are somewhere
// The dashboard.controller.ts assumes all models are registered!

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const ClientBill = mongoose.model('ClientBill');
    console.log("ClientBill is registered:", !!ClientBill);
  } catch (e) {
    console.log("ClientBill model not found!");
  }
  process.exit(0);
}).catch(console.error);
