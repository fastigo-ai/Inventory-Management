const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Inward = mongoose.connection.collection('storeinwardentries');
  const missing = await Inward.countDocuments({ itemId: null });
  const total = await Inward.countDocuments();
  console.log(`Inwards missing itemId: ${missing} out of ${total}`);
  
  const Assignment = mongoose.connection.collection('contractorassignments');
  const missingAssign = await Assignment.countDocuments({ "lineItems.itemId": null });
  const totalAssign = await Assignment.countDocuments();
  console.log(`Assignments missing itemId in lineItems: ${missingAssign} out of ${totalAssign}`);
  
  process.exit(0);
});
