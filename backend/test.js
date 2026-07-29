const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0').then(async () => {
  const Summary = mongoose.model('ItemSummary', new mongoose.Schema({}, { strict: false }));
  const nameSearch = await Summary.find({ itemName: /ACSR/i });
  console.log('ACSR summaries:', nameSearch.length);
  console.log(JSON.stringify(nameSearch.map(s => ({ itemName: s.itemName, circle: s.circle, package: s.package, loa: s.loaQty, itemId: s.itemId })), null, 2));
  process.exit(0);
}).catch(console.error);
