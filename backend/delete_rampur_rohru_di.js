require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGO_URI found');
    process.exit(1);
  }
  
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const dis = db.collection('dis');

  // Find counts for safety check
  const totalCount = await dis.countDocuments();
  console.log(`Total DIs before deletion: ${totalCount}`);
  
  const rampurRohruCount = await dis.countDocuments({
    circle: { $regex: /^(rampur|rohru)$/i }
  });
  console.log(`DIs belonging to Rampur or Rohru: ${rampurRohruCount}`);

  const solanNahanCount = await dis.countDocuments({
    circle: { $regex: /^(solan|nahan)$/i }
  });
  console.log(`DIs belonging to Solan or Nahan: ${solanNahanCount}`);

  if (rampurRohruCount > 0) {
    const result = await dis.deleteMany({
      circle: { $regex: /^(rampur|rohru)$/i }
    });
    console.log(`Deleted ${result.deletedCount} DIs from Rampur/Rohru.`);
  } else {
    console.log('No Rampur or Rohru DIs found to delete.');
  }

  // Verify post-deletion
  const postSolanNahanCount = await dis.countDocuments({
    circle: { $regex: /^(solan|nahan)$/i }
  });
  console.log(`DIs belonging to Solan or Nahan AFTER deletion: ${postSolanNahanCount}`);
  
  const postTotalCount = await dis.countDocuments();
  console.log(`Total DIs after deletion: ${postTotalCount}`);

  process.exit(0);
}

run().catch(console.error);
