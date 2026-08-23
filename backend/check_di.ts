import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const DI = mongoose.connection.collection('dis');
    
    const di = await DI.findOne({ diNumber: '1479-1510' });
    if (di && di.lineItems) {
        const item = di.lineItems.find(i => String(i.loaSerialNo) === '114');
        console.log('Item in 1479-1510:', JSON.stringify(item, null, 2));
    }
    
    process.exit(0);
}
check();
