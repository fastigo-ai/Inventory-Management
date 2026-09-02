const mongoose = require('mongoose');
const { ClientBill } = require('./dist/modules/client-billing/clientBill.schema.js');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // Let's test the exact filtering logic
  const req = {
    user: {
      role: { name: 'Super Admin' },
      assignedCircle: 'All',
      assignedPackage: 'All'
    }
  };
  
  let query = {};
  if (req.user?.role?.name !== 'Super Admin') {
    if (req.user?.assignedCircle && req.user.assignedCircle !== 'All') {
      query.circle = { $regex: new RegExp(`^${req.user.assignedCircle}$`, 'i') };
    }
    if (req.user?.assignedPackage && req.user.assignedPackage !== 'All') {
      query.package = { $regex: new RegExp(`^${req.user.assignedPackage}$`, 'i') };
    }
  }
  
  const bills = await ClientBill.find(query).sort({ createdAt: -1 });
  console.log("Super Admin Result Count:", bills.length);

  const req2 = {
    user: {
      role: { name: 'Site Engineer' },
      assignedCircle: 'Nahan',
      assignedPackage: 'Package 1 (S/N)'
    }
  };
  
  let query2 = {};
  if (req2.user?.role?.name !== 'Super Admin') {
    if (req2.user?.assignedCircle && req2.user.assignedCircle !== 'All') {
      query2.circle = { $regex: new RegExp(`^${req2.user.assignedCircle}$`, 'i') };
    }
    if (req2.user?.assignedPackage && req2.user.assignedPackage !== 'All') {
      query2.package = { $regex: new RegExp(`^${req2.user.assignedPackage}$`, 'i') };
    }
  }
  
  const bills2 = await ClientBill.find(query2).sort({ createdAt: -1 });
  console.log("Site Engineer Result Count:", bills2.length);

  // what if assignedPackage has parentheses like 'Package 1 (S/N)'?
  // $regex: new RegExp(`^Package 1 (S/N)$`, 'i') -> the parentheses are regex capture groups!
  // It won't match literally unless escaped!

  process.exit(0);
}).catch(console.error);
