const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // 1. Update the Contractor Invoices
    const updateResult = await db.collection('contractorinvoices').updateMany(
      { 'legacyMetadata.circle': 'SOLAN' },
      { 
        $set: { 
          'legacyMetadata.circle': 'Solan',
          'legacyMetadata.package': 'Package 1(S/N)'
        } 
      }
    );
    console.log(`Updated ${updateResult.modifiedCount} Contractor Invoices to Package 1(S/N) and Solan.`);

    // 2. Update the PM Solan User
    const userResult = await db.collection('users').updateOne(
      { email: 'pm.solan@test.com' },
      { 
        $set: { 
          assignedCircle: 'Solan',
          assignedPackage: 'Package 1(S/N)'
        } 
      }
    );
    console.log(`Updated PM Solan user. Modified: ${userResult.modifiedCount}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
