const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const pkg = 'Package 1(S/N)';
  const circle = 'Nahan';
  
  const exprFiltersPartial = [
    { $regexMatch: { input: { $toString: `$dynamicData.package` }, regex: `${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, options: "i" } },
    { $regexMatch: { input: { $toString: `$dynamicData.circle` }, regex: `${circle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, options: "i" } }
  ];
  
  const items = await mongoose.connection.collection('items').find({ $expr: { $and: exprFiltersPartial } }).toArray();
  const activities = new Set(items.map(i => i.dynamicData?.activity).filter(Boolean));
  console.log(`Unique Activities: ${activities.size}`);
  console.log(Array.from(activities).slice(0, 10)); // print first 10
  
  process.exit(0);
}
run().catch(console.error);
