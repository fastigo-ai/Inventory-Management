const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const Item = mongoose.connection.collection('items');
  const items = await Item.find({}).toArray();
  
  const map = {};
  let collisions = 0;
  
  items.forEach(i => {
    const tc = i.dynamicData?.tempCode || i.tempCode;
    const name = i.dynamicData?.itemName || i.itemName;
    if (tc) {
      if (!map[tc]) map[tc] = new Set();
      map[tc].add(name);
    }
  });
  
  Object.keys(map).forEach(tc => {
    if (map[tc].size > 1) {
      console.log(`tempCode ${tc} has multiple names:`, Array.from(map[tc]));
      collisions++;
    }
  });
  
  console.log(`Total collisions: ${collisions}`);
  process.exit(0);
});
