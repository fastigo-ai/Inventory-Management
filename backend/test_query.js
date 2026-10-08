const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected');
    const { StoreInwardEntry } = require('./src/modules/store/inward.model');
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexibleRegex = (str) => str ? new RegExp(`^${str.replace(/\s+/g, '').split('').map(c => escapeRegex(c)).join('\\s*')}$`, 'i') : null;
    
    const circle = ["Nahan", "NAHAN"];
    const validValues = circle.filter(v => v && !v.startsWith('All '));
    const circleFilters = validValues.map(val => flexibleRegex(val));
    
    const pkg = ["Package 1(S/N)", "Package 1 (S/N)"];
    const pkgFilters = pkg.map(val => flexibleRegex(val));

    const matchStage = { circle: { $in: circleFilters }, package: { $in: pkgFilters } };
    console.log(matchStage);

    try {
      const res = await StoreInwardEntry.aggregate([{ $match: matchStage }, { $limit: 1 }]);
      console.log('Query OK:', res.length);
    } catch(e) {
      console.error('Query Failed:', e);
    }
    process.exit(0);
  });
