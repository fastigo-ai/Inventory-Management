import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp-system')
  .then(async () => {
    const user = await mongoose.connection.db?.collection('users').findOne({ email: 'Nahansite@gmail.com' });
    console.log("User email:", user?.email);
    console.log("Assigned Package:", user?.assignedPackage);
    console.log("Assigned Circle:", user?.assignedCircle);
    console.log("Company ID:", user?.companyId);
    
    // Check if there are demand notes for this user
    const dn = await mongoose.connection.db?.collection('demandnotes').find({ createdBy: user?._id }).toArray();
    console.log("Demand notes created by this user:", dn?.length);
    if (dn && dn.length > 0) {
      console.log("Latest DN package:", dn[dn.length - 1].package);
      console.log("Latest DN circle:", dn[dn.length - 1].circle);
    }
    
    mongoose.connection.close();
  });
