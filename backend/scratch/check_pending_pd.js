const mongoose = require('mongoose');
async function check() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority');
  
  const pendingCount = await mongoose.connection.db.collection('demandnotes').countDocuments({
    status: 'Pending PD Approval',
    package: { $regex: /Package 2/i }
  });

  const allPendingCount = await mongoose.connection.db.collection('demandnotes').countDocuments({
    status: 'Pending PD Approval'
  });

  const totalDemandNotes = await mongoose.connection.db.collection('demandnotes').countDocuments({
    package: { $regex: /Package 2/i }
  });
  
  console.log('Pending for PD (Package 2):', pendingCount);
  console.log('Total Pending PD Approval (All Packages):', allPendingCount);
  console.log('Total Demand Notes in Package 2:', totalDemandNotes);
  
  process.exit(0);
}
check().catch(console.error);
