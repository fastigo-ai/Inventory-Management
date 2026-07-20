const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const createMockData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
    console.log('Connected to MongoDB');

    // 1. Vendor
    const vendorId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('vendors').insertOne({
      _id: vendorId,
      status: 'Verified',
      dynamicData: {
        companyName: 'Test Flow Vendor Ltd',
        contactPerson: 'Mr. Test',
        email: 'testflow@vendor.com'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Vendor created');

    // 2. Purchase Order
    const poId = new mongoose.Types.ObjectId();
    const itemId = new mongoose.Types.ObjectId();
    const poNumber = `PO-TEST-${Date.now().toString().slice(-4)}`;
    await mongoose.connection.collection('purchaseorders').insertOne({
      _id: poId,
      vendorName: 'Test Flow Vendor Ltd',
      purchaseOrderNumber: poNumber,
      date: new Date(),
      subTotal: 10000,
      total: 11800,
      cgstPercentage: 9,
      sgstPercentage: 9,
      circle: 'Solan',
      package: 'Package 1(S/N)',
      lineItems: [{
        itemId: itemId,
        itemName: 'Test Transformer 100kVA',
        unit: 'Nos',
        quantity: 10,
        rate: 1000,
        amount: 10000,
        loaSerialNo: 'LOA-999'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ Purchase Order created: ${poNumber}`);

    // 3. Purchase Invoice
    const invoiceNumber = `INV-TEST-${Date.now().toString().slice(-4)}`;
    await mongoose.connection.collection('purchaseinvoices').insertOne({
      invoiceNumber: invoiceNumber,
      vendorName: 'Test Flow Vendor Ltd',
      purchaseOrderId: poId,
      purchaseOrderNumber: poNumber,
      date: new Date(),
      subTotal: 10000,
      total: 11800,
      amountPaid: 0,
      balanceDue: 11800,
      status: 'Sent',
      lineItems: [{
        itemId: itemId,
        itemName: 'Test Transformer 100kVA',
        quantity: 10,
        rate: 1000,
        amount: 10000
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ Purchase Invoice created: ${invoiceNumber}`);

    // 4. DI Registration
    const diNumber = `DI-TEST-${Date.now().toString().slice(-4)}`;
    const diId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('dis').insertOne({
      _id: diId,
      diNumber: diNumber,
      purchaseOrderId: poId,
      date: new Date(),
      circle: 'Solan',
      package: 'Package 1(S/N)',
      status: 'Received',
      lineItems: [{
        itemId: itemId,
        itemName: 'Test Transformer 100kVA',
        quantity: 10,
        tempCode: 'TEMP-999',
        circle: 'Solan',
        package: 'Package 1(S/N)'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ DI Registration created: ${diNumber}`);

    // Ensure Store Manager has 'Solan' mapped
    const sm = await mongoose.connection.collection('users').findOne({ email: 'mallik00bis@gmail.com' });
    if (sm) {
      await mongoose.connection.collection('users').updateOne(
        { email: 'mallik00bis@gmail.com' },
        { $set: { assignedCircle: 'Solan', assignedPackage: 'Package 1(S/N)' } }
      );
      console.log(`✅ Verified Store Manager account: ${sm.email} mapped to Circle: Solan`);
    } else {
      console.log('⚠️ Store Manager account mallik00bis@gmail.com not found in DB. Ensure you use the correct login.');
    }

    console.log('\\n==================================================');
    console.log('🎉 Data Flow Seeded Successfully!');
    console.log('==================================================\\n');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

createMockData();
