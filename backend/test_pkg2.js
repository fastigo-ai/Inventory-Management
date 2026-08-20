require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const ContractorAssignment = mongoose.model('ContractorAssignment', new mongoose.Schema({}, { strict: false }));
  
  const all = await ContractorAssignment.find();
  const pkgDist = {};
  all.forEach(a => {
    (a.lineItems || []).forEach(li => {
      const p = li.package || 'None';
      pkgDist[p] = (pkgDist[p] || 0) + 1;
    });
  });
  console.log('Line Item Packages:', pkgDist);

  process.exit(0);
}
check();
