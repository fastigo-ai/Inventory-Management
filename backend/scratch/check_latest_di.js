require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const DI = mongoose.model('DI', new mongoose.Schema({}, {strict: false}));
    
    // Get total count
    const totalCount = await DI.countDocuments();
    
    // Get latest 5
    const latestDis = await DI.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('diNumber date createdAt')
        .lean();
    
    // Get DIs created in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await DI.countDocuments({ createdAt: { $gte: oneDayAgo } });
    
    console.log(`Total DIs in DB: ${totalCount}`);
    console.log(`DIs created in the last 24 hours: ${recentCount}`);
    console.log('Latest 5 DIs:');
    latestDis.forEach(di => {
        console.log(`- DI Number: ${di.diNumber} | Created: ${di.createdAt}`);
    });
    
    process.exit(0);
});
