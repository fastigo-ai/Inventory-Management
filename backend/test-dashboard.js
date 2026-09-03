const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
// Load models
require('./dist/modules/client-billing/clientBill.schema.js');
const { ClientBill } = mongoose.models;

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const assignedPackage = 'Package 1 (S/N)';
  const assignedCircle = 'Nahan';

  const baseQuery = {};
  if (assignedPackage && assignedPackage !== 'All') {
    baseQuery.package = { $regex: new RegExp(`^${escapeRegExp(assignedPackage.trim())}$`, 'i') };
  }
  if (assignedCircle && assignedCircle !== 'All') {
    baseQuery.circle = { $regex: new RegExp(`^${escapeRegExp(assignedCircle.trim())}$`, 'i') };
  }
  
  const pendingPMInvoicesCount = await ClientBill.countDocuments({
    ...baseQuery,
    status: 'Pending PM Approval'
  });
  console.log("Pending PM Approval Count:", pendingPMInvoicesCount);

  const pendingPDInvoicesCount = await ClientBill.countDocuments({
    ...baseQuery,
    status: 'Pending PD Approval'
  });
  console.log("Pending PD Approval Count:", pendingPDInvoicesCount);

  // If the user is Super Admin, what happens in PD/PM portal?
  // In `dashboard.controller.ts`:
  // PM Portal:
  // if (user.assignedPackage) baseQuery.package = ... 
  // Wait! If user is Super Admin, `user.assignedPackage` might be "All".
  // My fix was `if (user.assignedPackage && user.assignedPackage !== 'All')`.
  // So baseQuery for Super Admin is `{}`!
  // `{ status: 'Pending PM Approval' }` will count ALL!
  // Wait, does `status: 'Pending PM Approval'` count work?

  process.exit(0);
}).catch(console.error);
