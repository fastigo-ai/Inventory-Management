import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const items = await mongoose.connection.db?.collection('items').find({
      'dynamicData.circle': { $regex: /solan/i }
    }).toArray();
    console.log("Items in solan:", items?.length);
    
    mongoose.connection.close();
  });
