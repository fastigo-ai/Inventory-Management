import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    console.log("Searching for 'Transformer Bed' in dynamicData...");
    const items = await Item.find({
      $or: [
        { 'dynamicData.activity': { $regex: /Transformer Bed/i } },
        { 'dynamicData.description': { $regex: /Transformer Bed/i } },
        { 'dynamicData.name': { $regex: /Transformer Bed/i } }
      ]
    }).lean();

    items.forEach(i => {
      console.log(`- ID: ${i._id} | Activity: '${i.dynamicData.activity}' | Description: '${i.dynamicData.description}' | Name: '${i.dynamicData.name}'`);
    });

    console.log("\nSearching for 'HPSR'...");
    const items2 = await Item.find({
      $or: [
        { 'dynamicData.activity': { $regex: /HPSR/i } },
        { 'dynamicData.description': { $regex: /HPSR/i } },
        { 'dynamicData.name': { $regex: /HPSR/i } }
      ]
    }).lean();

    items2.forEach(i => {
      console.log(`- ID: ${i._id} | Activity: '${i.dynamicData.activity}' | Description: '${i.dynamicData.description}' | Name: '${i.dynamicData.name}'`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
