import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || '').then(async () => {
  const db = mongoose.connection.db;
  if (!db) return;

  try {
     const dn = await db.collection('demandnotes').findOne({ demandNoteNumber: 'DN-2609-0017' });
     if(dn) {
         console.log(dn.lineItems.map(item => ({ item: item.itemName, jmcQty: item.jmcQty })));
     }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
});
