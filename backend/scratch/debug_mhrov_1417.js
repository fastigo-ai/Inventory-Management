const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const dis = await mongoose.connection.collection('dis').find({ diNumber: '1417-47' }).toArray();
    console.log("Count of DIs with 1417-47:", dis.length);
    for (const d of dis) {
        console.log(`DI _id: ${d._id}, lineItems length: ${d.lineItems?.length}`);
        const li288 = d.lineItems?.find(l => String(l.loaSerialNo) === '288');
        if (li288) {
            console.log("Found 288 in DI", d._id);
            console.log(li288);
        }
    }
    process.exit(0);
}
run().catch(console.error);
