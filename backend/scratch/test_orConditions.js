const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }));

async function run() {
  try {
    const existingItems = await Item.find({ 'dynamicData.loaSerialNo': '1405' });
    
    const findItemInMemory = (tCode, loaSrNo, name, pkg, circ) => {
      const isMatch = (a, b) => {
        const valA = (a || '').replace(/\s+/g, '').toLowerCase();
        const valB = (b || '').replace(/\s+/g, '').toLowerCase();
        return valA === valB;
      };

      let circleCandidates = existingItems;
      if (circ) {
        circleCandidates = circleCandidates.filter(i => isMatch(i.dynamicData?.circle, circ));
      }

      if (loaSrNo) {
        const loaMatches = circleCandidates.filter(i => isMatch(i.dynamicData?.loaSerialNo || i.dynamicData?.sku || i.dynamicData?.loaSrNo, loaSrNo));
        if (loaMatches.length === 1) {
          return loaMatches[0];
        }
      }
      return null;
    };

    const item = findItemInMemory('94', '1405', 'GI STAY WIRE (7/3.15 MM)', 'Package 1(S/N)', 'Solan');
    console.log('Result:', item ? 'FOUND' : 'NOT FOUND');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

run();
