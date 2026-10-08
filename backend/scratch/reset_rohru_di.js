require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const DI = mongoose.model('DI', new mongoose.Schema({
    diNumber: String,
    circle: String,
    lineItems: [new mongoose.Schema({
      circle: String,
      quantity: Number,
      mhrovDoneQty: Number,
      pendingMhrovQty: Number,
      mhrovStatus: String
    }, { strict: false })]
  }, { strict: false, collection: 'dis' }));
  
  const dis = await DI.find({
    $or: [
      { circle: { $regex: /^Rohru$/i } },
      { 'lineItems.circle': { $regex: /^Rohru$/i } }
    ]
  });

  let modifiedCount = 0;

  for (const di of dis) {
    let modified = false;
    for (const item of di.lineItems) {
      // Check if either the item is Rohru or the DI is Rohru
      const isRohruItem = item.circle && item.circle.toLowerCase() === 'rohru';
      const isRohruDI = di.circle && di.circle.toLowerCase() === 'rohru';
      
      if (isRohruItem || isRohruDI) {
        if (item.mhrovDoneQty > 0 || item.mhrovStatus !== 'PENDING') {
          item.mhrovDoneQty = 0;
          item.pendingMhrovQty = item.quantity;
          item.mhrovStatus = 'PENDING';
          modified = true;
        }
      }
    }
    
    if (modified) {
      await di.save();
      modifiedCount++;
    }
  }

  console.log(`Reset mhrovDoneQty to 0 for ${modifiedCount} DIs related to Rohru.`);

  process.exit(0);
}
main().catch(console.error);
