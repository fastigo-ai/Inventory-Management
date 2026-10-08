const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const { buildCeoDashboardSummary } = require('./src/modules/dashboard/ceoDashboard.service');
  try {
    const data = await buildCeoDashboardSummary({ circle: "Solan", package: "Package 1(S/N)", subcircle: "Solan" });
    console.log("Success with filters");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
});
