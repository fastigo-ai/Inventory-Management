require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const DI = mongoose.model('DI', new mongoose.Schema({}, {strict: false}));
    const dis = await DI.find({circle: {$in: [/rampur/i, /solan/i]}}).select('diNumber circle lineItems').lean();
    
    let hasMhrovNo = 0;
    let noMhrovNo = 0;
    
    dis.forEach(d => {
        if(d.lineItems) {
            d.lineItems.forEach(li => {
                if(li.mhrovNumber || li.mhrovNo) {
                    hasMhrovNo++;
                } else {
                    noMhrovNo++;
                }
            });
        }
    });
    
    console.log(`DI lineItems with mhrovNo: ${hasMhrovNo}, without: ${noMhrovNo}`);
    process.exit(0);
});
