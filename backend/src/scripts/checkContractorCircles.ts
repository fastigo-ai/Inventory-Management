import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Contractor } from '../modules/contractors/contractor.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkContractors = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    console.log('Connected to DB');

    const contractors = await Contractor.find({
      $or: [
        { name: { $in: [new RegExp('tomar', 'i'), new RegExp('vinay', 'i')] } },
        { 'dynamicData.companyName': { $in: [new RegExp('tomar', 'i'), new RegExp('vinay', 'i')] } },
        { 'dynamicData.displayName': { $in: [new RegExp('tomar', 'i'), new RegExp('vinay', 'i')] } },
        { 'dynamicData.name': { $in: [new RegExp('tomar', 'i'), new RegExp('vinay', 'i')] } }
      ]
    }).lean();
    
    console.log(JSON.stringify(contractors.map(c => ({ 
      name: c.dynamicData?.displayName || c.dynamicData?.companyName || c.name,
      location: c.location,
      assignedLocations: c.assignedLocations,
      dynamicCircle: c.dynamicData?.circle,
      dynamicAssignedCircle: c.dynamicData?.assignedCircle,
      dynamicAssignedCircles: c.dynamicData?.assignedCircles
    })), null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkContractors();
