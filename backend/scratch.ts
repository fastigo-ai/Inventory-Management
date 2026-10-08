import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI as string).then(async () => {
    const db = mongoose.connection.db;
    if (!db) return;
    
    // Find a user to act as the approver (e.g. Super Admin)
    const adminUser = await db.collection('users').findOne({});
    const adminId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();
    const now = new Date();

    const result = await db.collection('clientbills').updateMany(
        { billType: 'Supply', status: { $ne: 'Approved' } },
        { 
            $set: { 
                status: 'Approved',
                pmApprovedBy: adminId,
                pmApprovedAt: now,
                pdApprovedBy: adminId,
                pdApprovedAt: now
            } 
        }
    );
    
    console.log(`Approved ${result.modifiedCount} Client Supply Bills across all steps and circles.`);
    
    process.exit(0);
});
