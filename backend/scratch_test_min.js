const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
require('ts-node/register');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const { ContractorAssignment } = require('./src/modules/contractors/contractorAssignment.schema');
    
    // Find a MIN with a decimal quantity like 0.5
    const min = await ContractorAssignment.findOne({ 
      "lineItems.quantity": 0.5 
    });
    
    if (min) {
      console.log("Found MIN:", min.assignmentNumber);
      console.log(JSON.stringify(min.lineItems.filter(l => l.quantity === 0.5), null, 2));
    } else {
      console.log("No MIN found with quantity 0.5");
      // Just print any recent one to check structure
      const recent = await ContractorAssignment.findOne().sort({ createdAt: -1 });
      if (recent) {
        console.log("Recent MIN:", recent.assignmentNumber);
        console.log(JSON.stringify(recent.lineItems[0], null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
