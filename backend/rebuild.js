const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  // Need to import the compiled output to get SummaryService
  const { SummaryService } = require('./dist/modules/reports/summary/summary.service.js');
  const Item = require('./dist/modules/items/item.model.js').default;

  const items = await Item.find({});
  let count = 0;
  
  for (const item of items) {
    await SummaryService.rebuildForItem(item._id.toString());
    count++;
    if (count % 100 === 0) console.log(`Rebuilt ${count}`);
  }
  
  console.log('Done rebuilding');
  process.exit(0);
}

run().catch(console.error);
