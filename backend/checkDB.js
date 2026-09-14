const mongoose = require('mongoose');
require('dotenv').config();
const { JmcRegister } = require('./src/modules/jmc/jmc.schema');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");

  const jmcs = await JmcRegister.find({ circle: /Nahan/i }).lean();
  console.log(`Found ${jmcs.length} JMCs with circle=Nahan`);

  for (const j of jmcs) {
    if (j.subDivision && j.subDivision.match(/Nalagarh|Baddi/i) || j.location && j.location.match(/Nalagarh/i)) {
      console.log(`Mismatch! JMC ID: ${j._id}, Circle: ${j.circle}, SubDivision: ${j.subDivision}, Location: ${j.location}`);
    }
    // Also print out the first few to see what they look like
  }
  
  // Just print any JMC that seems to be nalagarh
  const nalagarhJmcs = await JmcRegister.find({ $or: [{circle: /Nalagarh/i}, {subDivision: /Nalagarh/i}] }).lean();
  console.log(`Found ${nalagarhJmcs.length} JMCs with Nalagarh anywhere`);
  for (const j of nalagarhJmcs) {
    console.log(`Nalagarh JMC ID: ${j._id}, Circle: ${j.circle}, SubDivision: ${j.subDivision}, Location: ${j.location}`);
  }

  process.exit(0);
}
run();
