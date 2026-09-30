require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../src/modules/items/item.model').default;

mongoose.connect(process.env.MONGO_URI || process.env.DB_URI || process.env.MONGODB_URI)
  .then(async () => {
    try {
      const items = await Item.find({
        'dynamicData.circle': { $exists: true, $ne: '' },
        'dynamicData.loaSerialNo': { $exists: true, $ne: '' }
      }).limit(5).select('dynamicData');
      console.log('Sample items:', JSON.stringify(items, null, 2));
    } catch (err) {
      console.error(err);
    } finally {
      process.exit(0);
    }
  });
