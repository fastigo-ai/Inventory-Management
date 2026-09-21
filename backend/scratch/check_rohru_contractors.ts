import mongoose from 'mongoose';
import { Contractor } from '../src/modules/contractors/contractor.schema';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    const names = [
      'Narendra Kumar.', 'Narendra Kumar',
      'DEVENDER SHARMA',
      'JIYA LAL NEGI', 'JIYA LAL  NEGI',
      'DESH RAJ SHARMA'
    ];

    const contractors = await Contractor.find({
      $or: [
        { 'dynamicData.displayName': { $in: names.map(n => new RegExp(n, 'i')) } },
        { 'dynamicData.companyName': { $in: names.map(n => new RegExp(n, 'i')) } }
      ]
    }).lean();

    console.log("Contractors found:");
    contractors.forEach(c => {
      console.log(`- ${c.dynamicData.companyName || c.dynamicData.displayName} | Assigned Locations: ${c.assignedLocations} | Location: ${c.location}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
