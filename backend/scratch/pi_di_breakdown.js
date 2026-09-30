require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const PI = mongoose.model('PurchaseInvoice', new mongoose.Schema({}, { strict: false }));
    const DI = mongoose.model('DI', new mongoose.Schema({}, { strict: false }));
    
    const pis = await PI.find({}).lean();
    const dis = await DI.find({}).lean();
    
    const breakdown = {};
    
    pis.forEach(pi => {
        (pi.lineItems || []).forEach(li => {
            if ((li.tempCode == '1' || li.tempCode == 1) && String(li.circle).toLowerCase() === 'solan') {
                const loa = li.loaSerialNo;
                if (!breakdown[loa]) breakdown[loa] = { pi: 0, di: 0 };
                breakdown[loa].pi += Number(li.quantity || li.piQty || li.doneQty || 0);
            }
        });
    });
    
    dis.forEach(di => {
        (di.lineItems || []).forEach(li => {
            if ((li.tempCode == '1' || li.tempCode == 1) && String(li.circle).toLowerCase() === 'solan') {
                const loa = li.loaSerialNo;
                if (!breakdown[loa]) breakdown[loa] = { pi: 0, di: 0 };
                breakdown[loa].di += Number(li.quantity || 0);
            }
        });
    });
    
    console.log('--- Temp Code 1 (Solan) Breakdown ---');
    for (const loa in breakdown) {
        const { pi, di } = breakdown[loa];
        if (pi > di) {
            console.log(`LOA Sr No ${loa}: PI = ${pi}, DI = ${di}   (OVER-INVOICED by ${pi - di})`);
        }
    }
    
    process.exit(0);
});
