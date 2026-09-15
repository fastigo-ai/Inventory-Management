import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Import necessary models
import { Contractor } from '../modules/contractors/contractor.schema';
import DemandNote from '../modules/demand-notes/demandNote.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkDemandNotes = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    console.log('Connected to DB');

    const namesToCheck = [
      'tomar construction', 
      'tomar', 
      'vinay sharma', 
      'vinay'
    ];
    
    // Find contractors matching these names
    const contractors = await Contractor.find({
      $or: [
        { name: { $in: [new RegExp('tomar', 'i'), new RegExp('vinay', 'i')] } },
        { 'dynamicData.companyName': { $in: [new RegExp('tomar', 'i'), new RegExp('vinay', 'i')] } },
        { 'dynamicData.displayName': { $in: [new RegExp('tomar', 'i'), new RegExp('vinay', 'i')] } },
        { 'dynamicData.name': { $in: [new RegExp('tomar', 'i'), new RegExp('vinay', 'i')] } }
      ]
    });
    
    console.log(`Found ${contractors.length} contractors matching 'tomar' or 'vinay'`);
    
    for (const c of contractors) {
      const name = c.name || c.dynamicData?.companyName || c.dynamicData?.displayName || c.dynamicData?.name;
      console.log(`- Contractor: ${name} (ID: ${c._id})`);
      
      const demandNotes = await DemandNote.find({ contractorId: c._id }).lean();
      console.log(`  -> Demand Notes found: ${demandNotes.length}`);
      if (demandNotes.length > 0) {
          console.log(`  -> Note Numbers: ${demandNotes.map((n: any) => n.demandNoteNumber || n._id).join(', ')}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkDemandNotes();
