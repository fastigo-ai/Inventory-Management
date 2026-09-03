const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
// Load models
require('./dist/modules/client-billing/clientBill.schema.js');
const { ClientBill } = mongoose.models;

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Let's simulate pm@airef.com
  const assignedPackage = '';
  const assignedCircle = 'NAHAN';

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
  console.log("PM query:", baseQuery);
  console.log("Pending PM Approval Count for pm@airef.com:", pendingPMInvoicesCount);

  // pd@airef.com
  const pdPackage = undefined;
  const pdCircle = undefined;
  const pdQuery = {};
  if (pdPackage && pdPackage !== 'All') {
    pdQuery.package = { $regex: new RegExp(`^${escapeRegExp(pdPackage.trim())}$`, 'i') };
  }
  if (pdCircle && pdCircle !== 'All') {
    pdQuery.circle = { $regex: new RegExp(`^${escapeRegExp(pdCircle.trim())}$`, 'i') };
  }

  const pendingPDInvoicesCount = await ClientBill.countDocuments({
    ...pdQuery,
    status: 'Pending PD Approval'
  });
  console.log("PD query:", pdQuery);
  console.log("Pending PD Approval Count for pd@airef.com:", pendingPDInvoicesCount);

  process.exit(0);
}).catch(console.error);
