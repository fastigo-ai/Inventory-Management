import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || '').then(async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
     const dn = await db.collection('demandnotes').findOne({ demandNoteNumber: 'DN-2609-0017' });
     if (!dn) return;
     const id = dn.contractorId;

     const jmcRecords = await db.collection('jmcregisters').find({ contractorId: id, status: 'Approved' }).toArray();
     
     const map: any = {};
     const getKey = (activity: string, loaSrNo: string) => {
        return `${(activity || '').trim().toLowerCase()}_${(loaSrNo || '').trim().toLowerCase()}`;
     };

     jmcRecords.forEach(record => {
        record.items?.forEach((item: any) => {
          const key = getKey(item.activity, item.loaSerialNo || item.loaSrNo);
          if (!map[key]) map[key] = { jmcQty: 0, wipQty: 0, wipRequiredQty: 0 };
          const toAdd = (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
          if (toAdd < 0) console.log("Negative toAdd found:", toAdd, item);
          map[key].jmcQty += toAdd;
        });
     });

     let negativeFound = false;
     for (const [key, value] of Object.entries(map)) {
         if (value.jmcQty < 0) {
             negativeFound = true;
             console.log(`Key ${key} has negative jmcQty: ${value.jmcQty}`);
         }
     }
     
     if (!negativeFound) console.log("No negative JMC quantities found in aggregates.");
     
     console.log("Done checking JMC aggregates.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
});
