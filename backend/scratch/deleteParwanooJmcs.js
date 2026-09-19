const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const JmcRegister = mongoose.model('JmcRegister', new mongoose.Schema({
        division: String
    }, { collection: 'jmcregisters' }));

    const result = await JmcRegister.deleteMany({ division: { $regex: 'Parwanoo', $options: 'i' } });
    console.log(`Deleted ${result.deletedCount} JMCs for Parwanoo division.`);

    mongoose.connection.close();
}).catch(console.error);
