import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || '').then(async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
     const dn = await db.collection('demandnotes').findOne({ demandNoteNumber: 'DN-2609-0017' });
     if (dn && dn.items) {
         console.log("\nDN-2609-0017 JMC Qty summary:");
         dn.items.forEach((i: any) => {
             console.log(`Item: ${i.itemName}, JMC: ${i.jmcQty}, WIP: ${i.wipQty}, balBomQty: ${i.balBomQty}`);
         });
     }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
});
