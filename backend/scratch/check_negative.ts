import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || '').then(async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
     const negatives = await db.collection('jmcregisters').find({
         "items": { $elemMatch: { $or: [{ approvedQty: { $lt: 0 } }, { claimedQty: { $lt: 0 } }, { quantity: { $lt: 0 } }] } }
     }).toArray();
     
     console.log(`Found ${negatives.length} JMC registers with negative item quantities.`);
     if (negatives.length > 0) {
        console.log(JSON.stringify(negatives[0].items.filter((i: any) => i.approvedQty < 0 || i.claimedQty < 0 || i.quantity < 0), null, 2));
     }

     // Also check Demand Notes
     const dn = await db.collection('demandnotes').findOne({ demandNoteNumber: 'DN-2609-0017' });
     if (dn) {
         console.log("\nDN-2609-0017 JMC Qty summary:");
         dn.lineItems.forEach((i: any) => {
             if (Number(i.jmcQty) < 0) {
                 console.log(`NEGATIVE: Item ${i.itemName}, JMC: ${i.jmcQty}`);
             }
         });
     }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
});
