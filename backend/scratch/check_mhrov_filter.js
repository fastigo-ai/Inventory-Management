require('dotenv').config();
const mongoose = require('mongoose');
const { expandCircle } = require('./dist/utils/hierarchy');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected'))
  .catch(err => { console.error(err); process.exit(1); });

const Mhrov = mongoose.model('Mhrov', new mongoose.Schema({}, { strict: false }));

async function run() {
  // Simulate the solansite@gmail.com user filter
  const assignedCircle = 'Solan';
  const assignedPackage = 'Package 1(S/N)';

  const expanded = expandCircle(assignedCircle) || [assignedCircle];
  console.log('expandCircle:', expanded);

  const filter = {
    package: assignedPackage,
    circle: { $in: expanded }
  };
  console.log('Filter:', JSON.stringify(filter));

  const count = await Mhrov.countDocuments(filter);
  console.log('Count with both filters:', count);

  // Check without package filter
  const circleOnly = await Mhrov.countDocuments({ circle: { $in: expanded } });
  console.log('Count circle only:', circleOnly);

  // Check without circle filter
  const pkgOnly = await Mhrov.countDocuments({ package: assignedPackage });
  console.log('Count package only:', pkgOnly);

  // Sample
  const samples = await Mhrov.find(filter).select('mhrovNumber circle package').limit(5).lean();
  console.log('Sample:', samples);

  mongoose.connection.close();
}
run();
