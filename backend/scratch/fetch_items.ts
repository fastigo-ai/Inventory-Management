import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    const items = await Item.find({}).limit(20).lean();

    console.log("First 20 items in DB:");
    items.forEach(i => {
      console.log(`- ID: ${i._id} | Description: '${i.description}' | Circle: ${i.circles?.join(',')}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
