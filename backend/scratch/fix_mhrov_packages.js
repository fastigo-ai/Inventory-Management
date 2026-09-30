require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => { console.error(err); process.exit(1); });

const Mhrov = mongoose.model('Mhrov', new mongoose.Schema({}, { strict: false }));

async function run() {
  // Fix wrong packages in existing MHROVs
  // Check what invalid packages exist
  const all = await Mhrov.find({}).select('mhrovNumber circle package').lean();
  
  const VALID_PACKAGES = ['Package 1(S/N)', 'Package 2(R/R)'];
  const normalize = (s) => (s || '').replace(/\s+/g, '').toLowerCase();
  const validNorm = VALID_PACKAGES.map(normalize);

  const toFix = all.filter(m => !validNorm.includes(normalize(m.package)));
  console.log(`Found ${toFix.length} MHROVs with invalid package:`);
  
  const breakdown = {};
  toFix.forEach(m => {
    const k = `"${m.package}" | circle: ${m.circle}`;
    breakdown[k] = (breakdown[k] || 0) + 1;
  });
  console.log('Breakdown:', breakdown);

  if (toFix.length === 0) {
    console.log('Nothing to fix!');
    mongoose.connection.close();
    return;
  }

  // Auto-correct: if circle is Solan/Nahan → Package 1(S/N), if Rampur/Rohru → Package 2(R/R)
  let fixedCount = 0;
  for (const m of toFix) {
    const circle = (m.circle || '').toLowerCase();
    let correctPackage = null;

    if (circle.includes('solan') || circle.includes('nahan') || circle.includes('kumarhatti') || circle.includes('nalagarh')) {
      correctPackage = 'Package 1(S/N)';
    } else if (circle.includes('rampur') || circle.includes('rohru')) {
      correctPackage = 'Package 2(R/R)';
    }

    if (correctPackage) {
      await Mhrov.updateOne({ _id: m._id }, { $set: { package: correctPackage } });
      console.log(`Fixed MHROV ${m.mhrovNumber}: "${m.package}" → "${correctPackage}"`);
      fixedCount++;
    } else {
      console.log(`SKIPPED MHROV ${m.mhrovNumber}: package="${m.package}", circle="${m.circle}" — cannot determine correct package`);
    }
  }

  console.log(`\nDone. Fixed ${fixedCount}/${toFix.length} MHROVs.`);
  mongoose.connection.close();
}

run();
