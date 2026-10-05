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

    // Find how many DIs have lineItems with Nahan circle
    const disWithNahanItems = await db.collection('dis').find({ 
      "lineItems.circle": { $regex: /nahan/i } 
    }).toArray();
    
    console.log(`Found ${disWithNahanItems.length} DIs containing Nahan circle items.`);
    
    let totalItemsToDelete = 0;
    disWithNahanItems.forEach(di => {
      if (di.lineItems) {
        const nahanItems = di.lineItems.filter(item => item.circle && item.circle.toLowerCase().includes('nahan'));
        totalItemsToDelete += nahanItems.length;
      }
    });

    console.log(`Total Nahan line items to delete: ${totalItemsToDelete}`);

    // Update using $pull to remove those items
    if (totalItemsToDelete > 0) {
      const updateRes = await db.collection('dis').updateMany(
        { "lineItems.circle": { $regex: /nahan/i } },
        { $pull: { lineItems: { circle: { $regex: /nahan/i } } } }
      );
      console.log(`Successfully removed Nahan items from ${updateRes.modifiedCount} DI documents.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
