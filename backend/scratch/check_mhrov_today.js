require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Mhrov = mongoose.model('Mhrov', new mongoose.Schema({}, { strict: false }));
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const items = await Mhrov.find({ createdAt: { $gte: today } }).select('mhrovNumber circle package createdAt').lean();
    console.log('Imported today:', items.length);
    
    if(items.length > 0) {
        console.log('Sample from today:', items.slice(0, 5));
    }
    
    // Also check if any MHROVs exist with ANY circle containing 'ram' (case-insensitive) just in case
    const ramItems = await Mhrov.find({ circle: /ram/i }).lean();
    console.log('MHROVs with circle like "ram":', ramItems.length);
    
    // Check if any MHROVs were uploaded with an undefined circle
    const emptyCircleItems = await Mhrov.find({$or: [{circle: {$exists: false}}, {circle: null}, {circle: ''}]}).lean();
    console.log('MHROVs with empty circle:', emptyCircleItems.length);
    
    process.exit(0);
});
