require('dotenv').config();
const mongoose = require('mongoose');

async function checkInvoice() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  // Find a purchase invoice with Rampur items
  const invoice = await db.collection('purchaseinvoices').findOne({
    'lineItems.circle': { $regex: /^rampur$/i }
  });
  
  if (invoice) {
    const rampurItem = invoice.lineItems.find(i => i.circle && i.circle.toLowerCase() === 'rampur');
    console.log(JSON.stringify(rampurItem, null, 2));
  } else {
    console.log("No invoice found");
  }
  
  process.exit(0);
}

checkInvoice().catch(console.error);
