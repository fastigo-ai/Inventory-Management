const mongoose = require('mongoose');
require('dotenv').config();

const DivisionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  package: { type: String, default: '' },
  circle: { type: String, default: '' },
  subcircle: { type: String, default: '' },
}, { timestamps: true });
DivisionSchema.index({ name: 1, package: 1, circle: 1, subcircle: 1 }, { unique: true });
const Division = mongoose.models.Division || mongoose.model('Division', DivisionSchema);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const seeds = [
    { circle: 'Solan', name: 'Solan' },
    { circle: 'Solan', name: 'Nalagarh' },
    { circle: 'Solan', name: 'Kumarhatti' },
    { circle: 'Solan', name: 'Baddhi' },
    { circle: 'Solan', name: 'Parwahoo' },
    { circle: 'Solan', name: 'Arki' },
    { circle: 'Nahan', name: 'Nahan' },
    { circle: 'Nahan', name: 'Rajgarh' },
    { circle: 'Nahan', name: 'Poanta' },
    { circle: 'Rohru', name: 'Rohru' },
    { circle: 'Rohru', name: 'Jubbal' }
  ];

  for (const s of seeds) {
    try {
      await Division.updateOne(
        { name: s.name, circle: s.circle },
        { $setOnInsert: s },
        { upsert: true }
      );
    } catch (e) {
      console.error(e.message);
    }
  }
  console.log('Done seeding divisions');
  process.exit(0);
}
seed();
