import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    // See how items are stored
    const items = await mongoose.connection.db?.collection('items').find({
      'dynamicData.circle': { $exists: true }
    }).limit(2).toArray();
    console.log("Items with circle:", items?.length);
    if (items && items.length > 0) {
      console.log("Sample:", items[0].dynamicData);
    }
    
    const itemsPkg = await mongoose.connection.db?.collection('items').find({
      'dynamicData.package': { $exists: true }
    }).limit(2).toArray();
    console.log("Items with package:", itemsPkg?.length);
    
    mongoose.connection.close();
  });
