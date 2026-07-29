const mongoose = require('mongoose');
const { Schema } = mongoose;

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  
  // Create generic models for this script just to insert raw documents without schema validation headaches
  const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', new Schema({}, { strict: false }));
  const Contractor = mongoose.models.Contractor || mongoose.model('Contractor', new Schema({}, { strict: false }));
  const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', new Schema({}, { strict: false, collection: 'purchaseorders' }));
  const PurchaseInvoice = mongoose.models.PurchaseInvoice || mongoose.model('PurchaseInvoice', new Schema({}, { strict: false, collection: 'purchaseinvoices' }));
  const PR = mongoose.models.Pr || mongoose.model('Pr', new Schema({}, { strict: false, collection: 'prs' }));
  const DI = mongoose.models.DI || mongoose.model('DI', new Schema({}, { strict: false, collection: 'dis' }));
  const ContractorAssignment = mongoose.models.ContractorAssignment || mongoose.model('ContractorAssignment', new Schema({}, { strict: false, collection: 'contractorassignments' }));
  const ContractorReturn = mongoose.models.ContractorReturn || mongoose.model('ContractorReturn', new Schema({}, { strict: false, collection: 'contractorreturns' }));

  // 1. Create a dummy vendor
  const vendor = await Vendor.create({
    dynamicData: {
      companyName: 'Dummy Vendor Inc.',
      displayName: 'Dummy Vendor Inc.',
      primaryContact: { firstName: 'John', lastName: 'Doe' },
      status: 'Active',
      name: 'Dummy Vendor Inc.'
    }
  });

  const vendorName = 'Dummy Vendor Inc.';

  // 1a. Create dummy POs for vendor
  await PurchaseOrder.create([
    { vendorName, purchaseOrderNumber: 'PO-DUMMY-001', date: new Date('2024-01-10'), status: 'Sent', total: 50000, lineItems: [] },
    { vendorName, purchaseOrderNumber: 'PO-DUMMY-002', date: new Date('2024-02-15'), status: 'Sent', total: 75000, lineItems: [] },
    { vendorName, purchaseOrderNumber: 'PO-DUMMY-003', date: new Date('2024-03-20'), status: 'Draft', total: 120000, lineItems: [] }
  ]);

  // 1b. Create dummy PIs for vendor
  await PurchaseInvoice.create([
    { vendorName, invoiceNumber: 'INV-DUMMY-001', date: new Date('2024-01-20'), status: 'Paid', total: 50000, purchaseOrderNumber: 'PO-DUMMY-001' },
    { vendorName, invoiceNumber: 'INV-DUMMY-002', date: new Date('2024-02-28'), status: 'Pending', total: 75000, purchaseOrderNumber: 'PO-DUMMY-002' }
  ]);

  // 1c. Create dummy PRs for vendor
  await PR.create([
    { vendorName, purchaseReceiveNumber: 'PR-DUMMY-001', receiveDate: new Date('2024-01-22'), status: 'Received', invoiceQuantity: 100, act: 100, purchaseOrderNumber: 'PO-DUMMY-001' }
  ]);

  // 2. Create a dummy contractor
  const contractor = await Contractor.create({
    dynamicData: {
      displayName: 'Dummy Contractor LLC',
      primaryContact: { firstName: 'Jane', lastName: 'Smith' },
      status: 'Active',
      name: 'Dummy Contractor LLC'
    }
  });

  // 2a. Create dummy Assignments (MINs) for contractor
  await ContractorAssignment.create([
    { contractorId: contractor._id.toString(), assignmentNumber: 'MIN-DUMMY-001', minNo: 'MIN-001', date: new Date('2024-04-10'), status: 'Issued', total: 15000, lineItems: [{}, {}], circle: 'North', package: 'Pkg 1' },
    { contractorId: contractor._id.toString(), assignmentNumber: 'MIN-DUMMY-002', minNo: 'MIN-002', date: new Date('2024-04-25'), status: 'Issued', total: 8000, lineItems: [{}], circle: 'South', package: 'Pkg 2' }
  ]);

  // 2b. Create dummy Returns for contractor
  await ContractorReturn.create([
    { contractorId: contractor._id.toString(), returnNumber: 'RET-DUMMY-001', mrvNo: 'MRV-001', date: new Date('2024-05-05'), status: 'Returned', total: 2000, lineItems: [{}] }
  ]);

  console.log('Successfully generated sample data!');
  console.log(`Vendor: ${vendorName} (ID: ${vendor._id})`);
  console.log(`Contractor: Dummy Contractor LLC (ID: ${contractor._id})`);

  mongoose.disconnect();
}

run().catch(console.error);
