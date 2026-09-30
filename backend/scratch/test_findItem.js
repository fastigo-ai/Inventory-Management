const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Item = require('../dist/modules/items/item.model.js').default;
  
  // Fake what importDIs does
  const existingItems = await Item.find({ 
    $or: [
      { 'dynamicData.tempCode': { $in: ['94'] } },
      { 'dynamicData.loaSerialNo': { $in: ['2051'] } }
    ] 
  });
  
  console.log('existingItems length:', existingItems.length);
  
  const findItemInMemory = (tCode, loaSrNo, name, pkg, circ) => {
    const isMatch = (a, b) => {
      const valA = (a || '').toString().replace(/\s+/g, '').toLowerCase();
      const valB = (b || '').toString().replace(/\s+/g, '').toLowerCase();
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
    
    let candidates = circleCandidates;
    if (tCode) candidates = candidates.filter(i => isMatch(i.dynamicData?.tempCode, tCode));
    if (name) candidates = candidates.filter(i => isMatch(i.dynamicData?.name, name));
    if (pkg) candidates = candidates.filter(i => isMatch(i.dynamicData?.package, pkg));
    
    return candidates.length > 0 ? candidates[0] : null;
  };
  
  const item = findItemInMemory('94', '2051', 'GI STAY WIRE (7/3.15 MM)', 'Package 1(S/N)', 'Rampur');
  console.log('Result for Rampur:', item ? item.dynamicData.loaSerialNo : 'null');
  
  const item2 = findItemInMemory('94', '2051', 'GI STAY WIRE (7/3.15 MM)', 'Package 1(S/N)', 'Solan');
  console.log('Result for Solan:', item2 ? item2.dynamicData.loaSerialNo : 'null');

  process.exit(0);
}).catch(console.error);
