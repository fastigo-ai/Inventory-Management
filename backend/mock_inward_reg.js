require('dotenv').config();
const mongoose = require('mongoose');

async function update() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  try {
    const res = await db.collection('storeinwardentries').updateOne(
      { circle: 'Solan', invoiceNumber: { $regex: 'INV-SOLAN-' } },
      { 
        $set: { 
          status: 'SUBMITTED',
          challanNumber: 'CH-100234',
          transportName: 'Solan Express Transport',
          truckNumber: 'HP 14 A 9988',
          grNumber: 'GR-445566',
          grDate: new Date(),
          biltyNumber: 'BLT-778899',
          diRefNo: 'DI-REF-1001',
          remarks: 'Mock inward registration data successfully verified and entered.',
          receivedDate: new Date(),
          packingList: [
            { packType: 'BOX', quantity: 10, label: 'Box 1-10' },
            { packType: 'BAG', quantity: 5, label: 'Bags for hardware' }
          ]
        } 
      }
    );
    console.log(`Successfully populated Inward Registration data for ${res.modifiedCount} mock entry.`);
  } catch (err) {
    console.error('Error updating data:', err);
  } finally {
    await mongoose.disconnect();
  }
}
update();
