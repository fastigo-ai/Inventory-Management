import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    const items = await Item.find({
      description: { $regex: /Transformer Bed/i }
    }).lean();

    console.log("Items found matching 'Transformer Bed':");
    items.forEach(i => {
      console.log(`- ID: ${i._id} | Description: '${i.description}' | Unit: ${i.unit}`);
    });

    const items2 = await Item.find({
      description: { $regex: /Civil Work/i }
    }).lean();

    console.log("\nItems found matching 'Civil Work':");
    items2.forEach(i => {
      console.log(`- ID: ${i._id} | Description: '${i.description}' | Unit: ${i.unit}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
