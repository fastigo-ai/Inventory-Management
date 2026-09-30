const mongoose = require('mongoose');

require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

async function run() {
  try {
    const items = await Item.find({
      'dynamicData.tempCode': '94',
      'dynamicData.loaSerialNo': { $in: ['1405', '2051', '2086', '1344', '2111', '40', '107'] }
    });

    console.log(`Found ${items.length} items`);
    items.forEach(item => {
      console.log(`Item Name: ${item.name || item.dynamicData.name}`);
      console.log(`Circle: ${item.dynamicData.circle}`);
      console.log(`Package: ${item.dynamicData.package}`);
      console.log(`LOA Serial No: ${item.dynamicData.loaSerialNo}`);
      console.log(`TempCode: ${item.dynamicData.tempCode}`);
      console.log('---');
    });

    
    const itemsByCircle = await Item.aggregate([
      { $match: { 'dynamicData.tempCode': '94' } },
      { $group: { _id: '$dynamicData.circle', count: { $sum: 1 } } }
    ]);
    console.log('Item 94 count by circle:', itemsByCircle);
    

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

run();
