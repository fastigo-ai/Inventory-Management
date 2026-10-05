const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);
    const db = mongoose.connection.db;

    // Find the PIs that have lineItems with Nahan circle
    const pis = await db.collection('purchaseinvoices').find({ 
      "lineItems.circle": { $regex: /nahan/i } 
    }).toArray();
    
    console.log(`Found ${pis.length} PIs containing Nahan circle items.`);

    let pisWithOtherCircles = 0;
    const otherCirclesFound = new Set();
    const pisDetails = [];

    pis.forEach(pi => {
      let hasOtherCircle = false;
      const otherCirclesInThisPi = new Set();
      
      if (pi.lineItems && pi.lineItems.length > 0) {
        pi.lineItems.forEach(item => {
          // If circle exists and does NOT contain 'nahan'
          const circleName = item.circle ? item.circle.trim() : 'EMPTY/NULL';
          
          if (!circleName.toLowerCase().includes('nahan')) {
            hasOtherCircle = true;
            otherCirclesInThisPi.add(circleName);
            otherCirclesFound.add(circleName);
          }
        });
      }

      if (hasOtherCircle) {
        pisWithOtherCircles++;
        pisDetails.push({
          invoiceNumber: pi.invoiceNumber,
          otherCircles: Array.from(otherCirclesInThisPi)
        });
      }
    });

    if (pisWithOtherCircles > 0) {
      console.log(`Yes, ${pisWithOtherCircles} out of the ${pis.length} PIs contain items from other circles.`);
      console.log(`Other circles found: ${Array.from(otherCirclesFound).join(', ')}`);
      console.log(`Details by PI:`);
      pisDetails.forEach(detail => {
        console.log(`  Invoice ${detail.invoiceNumber} has other circles: ${detail.otherCircles.join(', ')}`);
      });
    } else {
      console.log(`No, all items in these ${pis.length} PIs belong exclusively to the Nahan circle (or have no circle specified).`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
