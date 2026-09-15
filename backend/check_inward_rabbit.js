require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const StoreInwardEntry = mongoose.model('StoreInwardEntry', new mongoose.Schema({}, { strict: false }));

  const inwards = await StoreInwardEntry.find({
    $or: [
      { "items.loaSrNo": "1331" },
      { "items.itemName": /RABBIT CONDUCTOR/i },
      { "packingList.itemName": /RABBIT CONDUCTOR/i },
      { "packingList.description": /RABBIT CONDUCTOR/i },
      { "tempCode": "1331" },
    ]
  }).lean();

  console.log(`Found ${inwards.length} inward entries.`);
  inwards.forEach(inw => {
    console.log(`- Inward: ${inw.invoiceNumber} | Circle: ${inw.circle} | TempCode: ${inw.tempCode}`);
  });

  mongoose.disconnect();
}
main();
