require('dotenv').config();
const mongoose = require('mongoose');

async function update() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  try {
    const res = await db.collection('storeinwardentries').updateOne(
      { circle: 'Solan', invoiceNumber: { $regex: 'INV-SOLAN-' } },
      { 
        $set: { status: 'PENDING_RECEIPT' },
        $unset: {
          challanNumber: "",
          transportName: "",
          truckNumber: "",
          grNumber: "",
          grDate: "",
          biltyNumber: "",
          diRefNo: "",
          remarks: "",
          receivedDate: "",
          packingList: ""
        }
      }
    );
    console.log(`Reverted 1 mock entry to PENDING_RECEIPT.`);
  } catch (err) {
    console.error('Error updating data:', err);
  } finally {
    await mongoose.disconnect();
  }
}
update();
