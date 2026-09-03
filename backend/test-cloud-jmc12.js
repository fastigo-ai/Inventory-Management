const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Jmc = mongoose.connection.collection('jmcregisters');
  const ak = await mongoose.connection.collection('contractors').findOne({ $or: [{ name: /A K Contractor/i }, { 'dynamicData.companyName': /A K Contractor/i }] });
  const jmcs = await Jmc.find({ contractorId: ak._id }).toArray();
  const Item = mongoose.connection.collection('items');
  const items = await Item.find({ _id: { $in: jmcs.flatMap(j => j.items.map(i => i.itemId)) } }).toArray();
  items.filter(i => (i.dynamicData?.itemName || i.itemName).includes('ALUMINIUM')).forEach(i => {
    console.log(`ALUMINIUM PAINT in JMC -> LOA Qty: ${i.dynamicData?.loaQuantity || i.loaQuantity}, pkg: ${i.dynamicData?.package || i.package}`);
  });
  process.exit(0);
});
