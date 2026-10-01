require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found');
    process.exit(1);
  }
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  const wos = db.collection('workorders');
  
  const wo = await wos.findOne({
    "drawings.drawingNumber": "39"
  });
  
  if (wo) {
    console.log("Found WO:");
    console.log("Root subcircle:", wo.subcircle);
    console.log("Drawings:");
    wo.drawings.forEach(d => {
      if (d.drawingNumber === "39") {
        console.log("Drawing 39 subcircle:", d.subcircle);
      }
    });
  } else {
    console.log("Work order with drawing 39 not found in 'workorders' collection.");
    const cwo = db.collection('contractorworkorders');
    const wo2 = await cwo.findOne({
      "drawings.drawingNumber": "39"
    });
    if (wo2) {
      console.log("Found in contractorworkorders:");
      console.log("Root subcircle:", wo2.subcircle);
      console.log("Drawings:");
      wo2.drawings.forEach(d => {
        if (d.drawingNumber === "39") {
          console.log("Drawing 39 subcircle:", d.subcircle, "Division:", d.division, "Sub Division:", d.subDivision, "Location:", d.location);
        }
      });
    }
  }
  process.exit(0);
}
check();
