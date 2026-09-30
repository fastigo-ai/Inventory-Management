require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Mhrov = mongoose.model('Mhrov', new mongoose.Schema({}, {strict: false}));
    const DI = mongoose.model('DI', new mongoose.Schema({}, {strict: false}));
    
    const mhrovs = await Mhrov.find({circle: /rampur/i}).lean();
    let brokenLinks = 0;
    let validLinks = 0;
    
    for (const m of mhrovs) {
        if (m.items && Array.isArray(m.items)) {
            for (const item of m.items) {
                if (item.diId) {
                    const di = await DI.findById(item.diId).lean();
                    if (di) {
                        validLinks++;
                    } else {
                        brokenLinks++;
                    }
                }
            }
        }
    }
    
    console.log(`Rampur MHROV links to DIs - Valid: ${validLinks}, Broken: ${brokenLinks}`);
    process.exit(0);
});
