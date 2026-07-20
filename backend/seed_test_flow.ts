import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import schemas
import { Vendor } from './src/modules/vendors/vendor.schema';
import { PurchaseOrder } from './src/modules/purchases/purchaseOrder.schema';
import { PurchaseInvoice } from './src/modules/purchases/purchaseInvoice.schema';
import { DI } from './src/modules/di/di.schema';
import { User } from './src/modules/users/user.schema';

async function seedTestFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected.');

    // 1. Create a Mock Vendor
    const vendor = new Vendor({
      userId: new mongoose.Types.ObjectId(), // Dummy ID
      templateId: new mongoose.Types.ObjectId(),
      status: 'Verified',
      dynamicData: {
        companyName: 'Test Flow Vendor Ltd',
        contactPerson: 'Mr. Test',
        email: 'testflow@vendor.com'
      }
    });
    await vendor.save();
    console.log('✅ Vendor created');

    // 2. Create a Mock PO
    const po = new PurchaseOrder({
      vendorName: 'Test Flow Vendor Ltd',
      purchaseOrderNumber: `PO-TEST-${Date.now().toString().slice(-4)}`,
      date: new Date(),
      subTotal: 10000,
      total: 11800,
      cgstPercentage: 9,
      sgstPercentage: 9,
      circle: 'Solan',
      package: 'Package 1(S/N)',
      lineItems: [
        {
          itemId: new mongoose.Types.ObjectId(), // Usually links to real item, keeping dummy for now
          itemName: 'Test Transformer 100kVA',
          unit: 'Nos',
          quantity: 10,
          rate: 1000,
          amount: 10000,
          loaSerialNo: 'LOA-999'
        }
      ]
    });
    await po.save();
    console.log(`✅ Purchase Order created: ${po.purchaseOrderNumber}`);

    // 3. Create a Mock Purchase Invoice against PO
    const pi = new PurchaseInvoice({
      invoiceNumber: `INV-TEST-${Date.now().toString().slice(-4)}`,
      vendorName: 'Test Flow Vendor Ltd',
      purchaseOrderId: po._id,
      purchaseOrderNumber: po.purchaseOrderNumber,
      date: new Date(),
      subTotal: 10000,
      total: 11800,
      amountPaid: 0,
      balanceDue: 11800,
      status: 'Sent',
      lineItems: [
        {
          itemId: po.lineItems[0].itemId,
          itemName: 'Test Transformer 100kVA',
          quantity: 10,
          rate: 1000,
          amount: 10000
        }
      ]
    });
    await pi.save();
    console.log(`✅ Purchase Invoice created: ${pi.invoiceNumber}`);

    // 4. Create a Mock DI against PO (Status must be 'Received' or 'Pending Receipt' so it appears in Pending List)
    const di = new DI({
      diNumber: `DI-TEST-${Date.now().toString().slice(-4)}`,
      purchaseOrderId: po._id,
      date: new Date(),
      circle: 'Solan',
      package: 'Package 1(S/N)',
      status: 'Received',
      lineItems: [
        {
          itemId: po.lineItems[0].itemId,
          itemName: 'Test Transformer 100kVA',
          quantity: 10,
          tempCode: 'TEMP-999',
          circle: 'Solan',
          package: 'Package 1(S/N)'
        }
      ]
    });
    await di.save();
    console.log(`✅ DI Registration created: ${di.diNumber}`);

    // Verify Store Manager Account exists
    const sm = await User.findOne({ email: 'mallik00bis@gmail.com' });
    if (sm) {
      // Ensure the SM is assigned to Solan so they can see it!
      sm.assignedCircle = 'Solan';
      await sm.save();
      console.log(`✅ Verified Store Manager account: ${sm.email} mapped to Circle: Solan`);
    } else {
      console.log(`⚠️ Store Manager account 'mallik00bis@gmail.com' not found. You may need to create it or adjust the email.`);
    }

    console.log('\n==================================================');
    console.log('🎉 Data Flow Seeded Successfully!');
    console.log('You can now log in to the Store Manager Portal using:');
    console.log('Email: mallik00bis@gmail.com');
    console.log('Password: Inventory');
    console.log(`You will see DI ${di.diNumber} in the Pending Inward Registration list.`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding test flow:', err);
    process.exit(1);
  }
}

seedTestFlow();
