import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { requestContext } from '../core/utils/context';
import { PurchaseOrder } from '../modules/purchases/purchaseOrder.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  console.log('Connected to DB');

  const mockUserId = new mongoose.Types.ObjectId();

  await requestContext.run({ userId: mockUserId.toString() }, async () => {
    try {
      console.log('Testing Create PO...');
      const newPo = new PurchaseOrder({
        vendorName: 'Test Vendor tracking plugin',
        purchaseOrderNumber: 'PO-TEST-' + Date.now(),
        date: new Date(),
        subTotal: 100,
        total: 100,
        status: 'Draft',
        receiveStatus: 'Yet To Be Received'
      });
      
      const savedPo = await newPo.save();
      console.log('Created PO ID:', savedPo._id);
      console.log('createdBy:', savedPo.createdBy);
      console.log('updatedBy:', savedPo.updatedBy);
      
      if (savedPo.createdBy?.toString() === mockUserId.toString() && savedPo.updatedBy?.toString() === mockUserId.toString()) {
        console.log('✅ CREATE TEST PASSED');
      } else {
        console.log('❌ CREATE TEST FAILED');
      }

      console.log('\nTesting Update PO...');
      const newUserId = new mongoose.Types.ObjectId();
      
      await requestContext.run({ userId: newUserId.toString() }, async () => {
        const updatedPo = await PurchaseOrder.findOneAndUpdate(
          { _id: savedPo._id },
          { vendorName: 'Updated Vendor' },
          { new: true }
        );
        
        console.log('Updated PO ID:', updatedPo?._id);
        console.log('createdBy (should be old):', updatedPo?.createdBy);
        console.log('updatedBy (should be new):', updatedPo?.updatedBy);
        
        if (updatedPo?.createdBy?.toString() === mockUserId.toString() && updatedPo?.updatedBy?.toString() === newUserId.toString()) {
          console.log('✅ UPDATE TEST PASSED');
        } else {
          console.log('❌ UPDATE TEST FAILED');
        }
        
        // Clean up
        await PurchaseOrder.findByIdAndDelete(savedPo._id);
        console.log('Test completed and cleaned up.');
      });

    } catch (e) {
      console.error(e);
    }
  });

  process.exit(0);
}

runTest();
