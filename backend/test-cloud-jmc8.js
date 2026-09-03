const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const JmcSchema = new mongoose.Schema({ contractorId: mongoose.Schema.Types.ObjectId, items: [{ itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }, approvedQty: Number, claimedQty: Number }], status: String });
  const Jmc = mongoose.model('JmcRegister', JmcSchema, 'jmcregisters');
  const Item = mongoose.model('Item', new mongoose.Schema({}), 'items');
  const Contractor = mongoose.connection.collection('contractors');
  
  const ak = await Contractor.findOne({ $or: [{ name: /A K Contractor/i }, { 'dynamicData.companyName': /A K Contractor/i }] });
  
  const jmcs = await Jmc.find({ contractorId: ak._id }).populate('items.itemId').lean();
  console.log("Populated items.itemId:", JSON.stringify(jmcs[0].items[0].itemId));
  console.log("JMC 1 items length:", jmcs[0].items.length);
  process.exit(0);
});
