const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    const items = await db.collection('items').find({ 
      $or: [
        { itemName: { $regex: /STP 9 MTR/i } },
        { 'dynamicData.itemName': { $regex: /STP 9 MTR/i } }
      ]
    }).toArray();
    
    console.log(`Found ${items.length} items matching 'STP 9 MTR':`);
    items.forEach(i => {
      console.log(`- ID: ${i._id} | Circle: ${i.dynamicData?.circle || i.circle || 'N/A'} | TempCode: ${i.dynamicData?.tempCode || i.tempCode || 'N/A'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
