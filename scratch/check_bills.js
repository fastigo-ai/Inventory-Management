const mongoose = require('mongoose');
const { ClientBill } = require('../backend/src/modules/client-billing/clientBill.schema.ts');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    // dynamically load the model or just use raw collection
    const bills = await mongoose.connection.collection('clientbills').find({}).toArray();
    console.log(`Total ClientBills: ${bills.length}`);
    if (bills.length > 0) {
        console.log("Sample Bill:");
        console.log({
            raBillNo: bills[0].raBillNo,
            billType: bills[0].billType,
            stage: bills[0].stage,
            status: bills[0].status,
            itemCount: bills[0].items ? bills[0].items.length : 0,
            sampleItemAmount: bills[0].items && bills[0].items.length > 0 ? bills[0].items[0].totalAmount : null
        });
    }
    process.exit(0);
});
