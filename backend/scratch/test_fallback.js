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
        if (loaMatches.length === 1) return loaMatches[0];
      }
      
      let candidates = circleCandidates;
      if (tCode) candidates = candidates.filter(i => isMatch(i.dynamicData?.tempCode, tCode));
      if (name) candidates = candidates.filter(i => isMatch(i.dynamicData?.name, name));
      if (pkg) candidates = candidates.filter(i => isMatch(i.dynamicData?.package, pkg));
      
      if (candidates.length > 0) return candidates[0];

      if (loaSrNo) {
        const globalLoaMatches = existingItems.filter(i => isMatch(i.dynamicData?.loaSerialNo || i.dynamicData?.sku || i.dynamicData?.loaSrNo, loaSrNo));
        if (globalLoaMatches.length === 1) return globalLoaMatches[0];
      }
      let globalCandidates = existingItems;
      if (tCode) globalCandidates = globalCandidates.filter(i => isMatch(i.dynamicData?.tempCode, tCode));
      if (name) globalCandidates = globalCandidates.filter(i => isMatch(i.dynamicData?.name, name));
      if (globalCandidates.length > 0) return globalCandidates[0];

      return null;
    };

    // INTENTIONALLY WRONG CIRCLE: Nahan
    const item = findItemInMemory('94', '1405', 'GI STAY WIRE (7/3.15 MM)', 'Package 1(S/N)', 'Nahan');
    console.log('Result with Nahan:', item ? 'FOUND! (Circle: ' + item.dynamicData.circle + ')' : 'NOT FOUND');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

run();
