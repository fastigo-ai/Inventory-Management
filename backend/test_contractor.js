require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  const Contractor = require('./src/modules/contractors/contractor.schema').Contractor;
  try {
    const fallbackName = "Test Contractor";
    const newContractor = await Contractor.create({ 
      dynamicData: { companyName: fallbackName, name: fallbackName, vendorName: fallbackName },
      isActive: true
    });
    console.log("Created successfully", newContractor);
  } catch (e) {
    console.error("Error:", e.message);
  }
  process.exit();
}
test();
