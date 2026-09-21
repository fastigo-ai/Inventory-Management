import mongoose from 'mongoose';
import { Contractor } from '../src/modules/contractors/contractor.schema';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory');
    
    const existing = await Contractor.findOne({ 'dynamicData.companyName': 'Narendra Kumar' });
    if (existing) {
      console.log('Contractor already exists:', existing._id);
    } else {
      const newContractor = new Contractor({
        dynamicData: {
          companyName: 'Narendra Kumar',
          displayName: 'Narendra Kumar',
        },
        assignedLocations: ['Rohru'],
        isActive: true
      });
      await newContractor.save();
      console.log('Created Narendra Kumar:', newContractor._id);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
