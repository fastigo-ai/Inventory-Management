const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  
  const result = await db.collection('purchaseinvoices').updateMany(
    { status: { $ne: 'Paid' } }, // Update all that aren't already Paid (including Draft)
    { $set: { status: 'Paid' } }
  );

  console.log(`Successfully updated ${result.modifiedCount} Purchase Invoices to 'Paid' status!`);
  
  mongoose.disconnect();
});
