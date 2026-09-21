import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    console.log("Searching for 'Transformer'...");
    const items = await Item.find({
      description: { $regex: /Transformer/i }
    }).lean();

    items.forEach(i => {
      console.log(`- ID: ${i._id} | Description: '${i.description}'`);
    });

    console.log("\nSearching for 'HPSR'...");
    const items2 = await Item.find({
      description: { $regex: /HPSR/i }
    }).lean();

    items2.forEach(i => {
      console.log(`- ID: ${i._id} | Description: '${i.description}'`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
