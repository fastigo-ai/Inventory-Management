const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

async function checkDbSize() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not set in .env');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    const dataSizeMB = (stats.dataSize / (1024 * 1024)).toFixed(2);
    const storageSizeMB = (stats.storageSize / (1024 * 1024)).toFixed(2);
    const indexSizeMB = (stats.indexSize / (1024 * 1024)).toFixed(2);
    
    console.log(`\n--- Database Statistics ---`);
    console.log(`Database Name: ${stats.db}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Objects (Documents): ${stats.objects}`);
    console.log(`Data Size (Uncompressed): ${dataSizeMB} MB`);
    console.log(`Storage Size (Allocated on Disk): ${storageSizeMB} MB`);
    console.log(`Index Size: ${indexSizeMB} MB`);
    console.log(`---------------------------\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDbSize();
