
const mongoose = require('mongoose');
const { getInvoicesService } = require('./src/modules/contractor-billing/billing.service');

const mockUserNahan = { assignedCircle: 'Nahan', assignedPackage: 'Package-1 (S/N)', role: { name: 'Project Manager' } };
const mockUserSolan = { assignedCircle: 'Solan', assignedPackage: 'Package-1 (S/N)', role: { name: 'Project Manager' } };

async function runTest() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  let res = await getInvoicesService({}, mockUserNahan);
  console.log('Nahan User sees legacy invoices:', res.filter((i:any) => i.legacyMetadata).length);
  res = await getInvoicesService({}, mockUserSolan);
  console.log('Solan User sees legacy invoices:', res.filter((i:any) => i.legacyMetadata).length);
  process.exit(0);
}
runTest().catch(console.error);

