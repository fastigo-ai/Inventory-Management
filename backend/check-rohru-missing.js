const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const pis = await mongoose.connection.collection('purchaseinvoices').find({ 'lineItems.circle': { $regex: new RegExp(`^Nahan$`, 'i') } }).toArray();
  
  let rohruCount = 0;
  for (const pi of pis) {
    for (const item of pi.lineItems) {
      if (item.circle && item.circle.toLowerCase() === 'nahan') {
        const nahanInwards = await mongoose.connection.collection('storeinwardentries').find({
          purchaseInvoiceId: pi._id,
          itemName: item.itemName,
          circle: { $regex: new RegExp(`^Nahan$`, 'i') }
        }).toArray();
        
        if (nahanInwards.length === 0) {
           const rohruInwards = await mongoose.connection.collection('storeinwardentries').find({
            purchaseInvoiceId: pi._id,
            itemName: item.itemName,
            circle: { $regex: new RegExp(`^Rohru$`, 'i') }
          }).toArray();
          rohruCount += rohruInwards.length;
        }
      }
    }
  }
  
  console.log(`Found ${rohruCount} of the missing inwards sitting in Rohru!`);
  
  process.exit(0);
}
run().catch(console.error);
