const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const locRegex = /Nahan/i;
  const returnFilter = { $or: [{ store: locRegex }, { circle: locRegex }, { division: locRegex }] };
  
  const returns = await mongoose.connection.collection('contractorreturns').find(returnFilter).toArray();
  console.log(`Found ${returns.length} returns for Nahan`);
  
  let totalQty = 0;
  returns.forEach(doc => {
    (doc.lineItems || []).forEach(li => {
      totalQty += Number(li.quantity || 0);
    });
  });
  console.log(`Total returnedQty for Nahan: ${totalQty}`);
  
  process.exit(0);
}
run().catch(console.error);
