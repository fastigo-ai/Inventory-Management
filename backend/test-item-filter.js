const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const pkg = 'Package 1(S/N)';
  const circle = 'Nahan';
  
  const exprFilters = [
    { $regexMatch: { input: { $toString: `$dynamicData.package` }, regex: `^${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, options: "i" } },
    { $regexMatch: { input: { $toString: `$dynamicData.circle` }, regex: `^${circle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, options: "i" } }
  ];
  
  const count = await mongoose.connection.collection('items').countDocuments({ $expr: { $and: exprFilters } });
  console.log(`Exact match count: ${count}`);

  const exprFiltersPartial = [
    { $regexMatch: { input: { $toString: `$dynamicData.package` }, regex: `${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, options: "i" } },
    { $regexMatch: { input: { $toString: `$dynamicData.circle` }, regex: `${circle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, options: "i" } }
  ];
  
  const partialCount = await mongoose.connection.collection('items').countDocuments({ $expr: { $and: exprFiltersPartial } });
  console.log(`Partial match count: ${partialCount}`);
  
  process.exit(0);
}
run().catch(console.error);
