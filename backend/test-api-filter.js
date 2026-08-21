const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const circle = 'Nahan';
  const filter = {
    status: { $in: ['APPROVED', 'VERIFIED', 'INWARDED', 'SUBMITTED'] },
    purchaseInvoiceId: { $exists: true },
    circle: { $regex: new RegExp(`^\\s*${circle.trim()}\\s*$`, 'i') }
  };

  const count = await mongoose.connection.collection('storeinwardentries').countDocuments(filter);
  console.log(`[${circle}] Total inward entries matching API filter: ${count}`);

  const sample = await mongoose.connection.collection('storeinwardentries').find(filter).limit(1).toArray();
  console.log('Sample entry:', JSON.stringify(sample[0], null, 2));

  process.exit(0);
}
run().catch(console.error);
