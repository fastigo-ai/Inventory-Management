require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const ContractorAssignment = mongoose.model('ContractorAssignment', new mongoose.Schema({}, { strict: false }));
  
  const all = await ContractorAssignment.find();
  console.log('Total Assignments:', all.length);
  const pkgDist = {};
  all.forEach(a => {
    const p = a.package || 'None';
    pkgDist[p] = (pkgDist[p] || 0) + 1;
  });
  console.log('Packages:', pkgDist);
  
  const circleDist = {};
  all.forEach(a => {
    const c = a.circle || a.location || 'None';
    circleDist[c] = (circleDist[c] || 0) + 1;
  });
  console.log('Circles:', circleDist);

  process.exit(0);
}
check();
