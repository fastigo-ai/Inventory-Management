require('dotenv').config();
const mongoose = require('mongoose');
const { getCeoDashboardSummary } = require('./dist/modules/dashboard/dashboard.controller.js') || {};

async function test() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    // Well, wait. I don't need to run it this way. Let's just login and fetch.
  } catch (err) {
    console.error(err);
  }
}
test();
