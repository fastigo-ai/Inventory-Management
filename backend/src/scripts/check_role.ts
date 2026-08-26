import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const user = await mongoose.connection.db?.collection('users').findOne({ email: 'Nahansite@gmail.com' });
    console.log("User:", user?.email, "Role ID:", user?.role);
    
    if (user?.role) {
      const role = await mongoose.connection.db?.collection('roles').findOne({ _id: user.role });
      console.log("Role Name:", role?.name);
    }
    
    mongoose.connection.close();
  });
