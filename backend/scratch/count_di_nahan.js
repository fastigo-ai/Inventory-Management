const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI;

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Some mongo URIs don't have the db name in path, but it might be 'test' by default. Let's see what DB we connect to.
    console.log(`Connected to database: ${mongoose.connection.name}`);
    
    // We can directly use the native driver to search the "dis" collection which Mongoose likely uses for the "DI" model.
    const db = mongoose.connection.db;
    
    // The collection name could be 'dis'. Mongoose lowercases and pluralizes 'DI' to 'dis'.
    const count = await db.collection('dis').countDocuments({ circle: { $regex: /nahan/i } });
    console.log(`Count of DIs in Nahan circle (case insensitive): ${count}`);

    // Just in case, let's also check if they are stored inside 'di' collection
    const count2 = await db.collection('di').countDocuments({ circle: { $regex: /nahan/i } });
    if(count2 > 0) {
       console.log(`Count in 'di' collection: ${count2}`);
    }

    const exactCount = await db.collection('dis').countDocuments({ circle: "Nahan" });
    console.log(`Count of DIs with exact circle 'Nahan': ${exactCount}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
