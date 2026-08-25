const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME })
  .then(async () => {
    console.log("Connected to MongoDB.");
    
    // Check DI indexes
    const DI = mongoose.model('DI', new mongoose.Schema({}, { strict: false }));
    const diIndexes = await DI.collection.indexes().catch(()=>[]);
    console.log("DI Indexes:");
    diIndexes.forEach(idx => console.log(Object.keys(idx.key)));

    // Check Item indexes
    const Item = mongoose.model('Item', new mongoose.Schema({}, { strict: false }));
    const itemIndexes = await Item.collection.indexes().catch(()=>[]);
    console.log("Item Indexes:");
    itemIndexes.forEach(idx => console.log(Object.keys(idx.key)));
    
    // Check MHROV indexes
    const MHROV = mongoose.model('MHROV', new mongoose.Schema({}, { strict: false }));
    const mhrovIndexes = await MHROV.collection.indexes().catch(()=>[]);
    console.log("MHROV Indexes:");
    mhrovIndexes.forEach(idx => console.log(Object.keys(idx.key)));

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
