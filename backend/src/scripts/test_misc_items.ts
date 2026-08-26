import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const allItems = await mongoose.connection.db?.collection('items').countDocuments();
    const pkgItems = await mongoose.connection.db?.collection('items').countDocuments({
      'dynamicData.package': { $exists: true }
    });
    console.log(`Total items: ${allItems}`);
    console.log(`Items with package: ${pkgItems}`);
    
    mongoose.connection.close();
  });
