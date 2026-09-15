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
      id: c._id, 
      name: c.name, 
      displayName: c.dynamicData?.displayName,
      companyName: c.dynamicData?.companyName,
      isActive: c.isActive 
    })), null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkContractors();
