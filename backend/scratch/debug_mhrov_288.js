const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const dis = await mongoose.connection.collection('dis').find({}).toArray();
    
    console.log("Total DIs in DB:", dis.length);
    
    let found288 = [];
    
    for (const d of dis) {
        const li288 = d.lineItems?.find(l => String(l.loaSerialNo) === '288');
        if (li288) {
            found288.push({ id: d._id, diNumber: d.diNumber, itemName: li288.itemName });
        }
    }
    
    console.log("Found 288 in these DIs:");
    console.log(found288);
    
    // Also find any DI containing "1417"
    const di1417 = dis.filter(d => String(d.diNumber).includes('1417'));
    console.log("DIs with 1417 in diNumber:");
    for (const d of di1417) {
        console.log(`diNumber: "${d.diNumber}", _id: ${d._id}, lineItems length: ${d.lineItems?.length}`);
    }
    
    process.exit(0);
}
run().catch(console.error);
