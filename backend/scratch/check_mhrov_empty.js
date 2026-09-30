require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Mhrov = mongoose.model('Mhrov', new mongoose.Schema({}, { strict: false }));
    const items = await Mhrov.find({
        $or: [
            { circle: { $exists: false } }, 
            { circle: null }, 
            { circle: '' },
            { circle: undefined }
        ]
    }).lean();
    
    console.log('Empty circles:', items.length);
    if(items.length > 0) {
        console.log('Sample:', items[0]);
    }
    process.exit(0);
});
