const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0&retryWrites=true&w=majority');
  
  const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

  console.log("Searching for 'Steel Tubular Poles (9 m, Working Load > 200 kgf/m²)' in Nahan...");
  const items1 = await Item.find({ 
    $or: [
      { 'dynamicData.circle': { $regex: /nahan/i } },
      { 'circle': { $regex: /nahan/i } }
    ]
  }).lean();

  let foundCount = 0;
  items1.forEach(item => {
    const desc = item.dynamicData?.description || item.dynamicData?.name || '';
    if (desc.toLowerCase().includes('steel tubular poles')) {
      console.log("Found Match! ->", desc);
      console.log("   SKU:", item.dynamicData?.sku || item.dynamicData?.loaSrNo);
      console.log("   Circle:", item.dynamicData?.circle);
      foundCount++;
    }
  });

  if (foundCount === 0) console.log("No items found matching 'Steel Tubular Poles' in Nahan circle.");

  console.log("Searching for 'STP 11 Mtr' in Nahan...");
  items1.forEach(item => {
    const desc = item.dynamicData?.description || item.dynamicData?.name || '';
    if (desc.toLowerCase().includes('stp 11 mtr')) {
      console.log("Found Match! ->", desc);
      console.log("   SKU:", item.dynamicData?.sku || item.dynamicData?.loaSrNo);
    }
  });

  console.log("\nSearching for '3x70mm' in Nahan...");
  items1.forEach(item => {
    const desc = item.dynamicData?.description || item.dynamicData?.name || '';
    if (desc.toLowerCase().includes('3x70mm')) {
      console.log("Found Match! ->", desc);
      console.log("   SKU:", item.dynamicData?.sku || item.dynamicData?.loaSrNo);
    }
  });

  mongoose.disconnect();
}

run().catch(console.error);
