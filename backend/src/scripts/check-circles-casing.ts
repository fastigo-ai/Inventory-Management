import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const db = mongoose.connection.db!;

  const distinctInwardCircles = await db.collection('storeinwardentries').distinct('circle');
  console.log('storeinwardentries circles:', distinctInwardCircles);

  const distinctSummaryCircles = await db.collection('itemsummaries').distinct('circle');
  console.log('itemsummaries circles:', distinctSummaryCircles);

  const distinctDiCircles = await db.collection('dis').distinct('lineItems.circle');
  console.log('dis lineItems.circle:', distinctDiCircles);

  const distinctPiCircles = await db.collection('purchaseinvoices').distinct('lineItems.circle');
  console.log('purchaseinvoices lineItems.circle:', distinctPiCircles);

  await mongoose.disconnect();
}
check().catch(console.error);
