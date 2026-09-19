const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const JmcRegister = mongoose.model('JmcRegister', new mongoose.Schema({
        location: String,
        division: String,
        subStation: String,
        feeder: String,
        jmcNumber: String,
        createdAt: Date,
        contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor' }
    }, { collection: 'jmcregisters' }));

    const dbJmcs = await JmcRegister.find({ division: { $regex: 'Parwanoo', $options: 'i' } }).lean();
    console.log('Total in DB:', dbJmcs.length);

    dbJmcs.forEach((j, i) => {
        console.log(`${i+1}. JMC: ${j.jmcNumber} | Loc: ${(j.location || j.subStation || j.feeder)} | Date: ${j.createdAt}`);
    });

    mongoose.connection.close();
}).catch(console.error);
