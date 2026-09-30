const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fastigo_erp').then(async () => {
  const Mhrov = require('./src/modules/store/mhrov.schema').default;
  const mhrov = await Mhrov.findOne({ mhrovNumber: '1' }).lean();
  console.log('Total items in mhrov 1:', mhrov.items.length);
  const uniqueIds = new Set(mhrov.items.map(i => i.itemId.toString()));
  console.log('Unique item IDs:', uniqueIds.size);
  console.log(Array.from(uniqueIds));
  process.exit(0);
}).catch(console.error);
