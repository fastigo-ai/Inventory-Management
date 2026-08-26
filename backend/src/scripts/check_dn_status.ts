import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const user = await mongoose.connection.db?.collection('users').findOne({ email: 'Nahansite@gmail.com' });
    const dn = await mongoose.connection.db?.collection('demandnotes').find({ createdBy: user?._id }).toArray();
    dn?.forEach(d => {
      console.log(`DN: ${d.demandNoteNumber}, Status: ${d.status}, Date: ${d.createdAt}`);
    });
    
    mongoose.connection.close();
  });
