import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || '').then(async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
    const dn = await db.collection('demandnotes').findOne({ demandNoteNumber: 'DN-2609-0017' });
    console.log("Demand Note:", JSON.stringify(dn, null, 2));

    if (dn) {
      // Find JMC records related to this contractor and items?
      const jmc = await db.collection('jmcregisters').find({ contractorId: dn.contractorId }).toArray();
      console.log(`Found ${jmc.length} JMC records for this contractor.`);
      
      const wip = await db.collection('wipregisters').find({ contractorId: dn.contractorId }).toArray();
      console.log(`Found ${wip.length} WIP consumed records for this contractor.`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
});
