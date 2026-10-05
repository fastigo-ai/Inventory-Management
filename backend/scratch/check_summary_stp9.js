const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    const summaries = await db.collection('itemsummaries').find({ 
      itemName: { $regex: /STP 9 MTR/i },
      circle: /Solan/i
    }).toArray();
    
    console.log("Solan STP 9 MTR Item Summaries:");
    console.log(summaries);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
