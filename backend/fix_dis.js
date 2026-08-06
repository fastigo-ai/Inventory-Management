require('mongoose').connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority').then(async () => {
  const Item = require('mongoose').model('Item', new require('mongoose').Schema({}, {strict: false}), 'items');
  const DI = require('mongoose').model('DI', new require('mongoose').Schema({}, {strict: false}), 'dis');
  const items = await Item.find({}).lean();
  
  const dis = await DI.find({}).lean();
  let updated = 0;
  for (const di of dis) {
    let changed = false;
    if (di.lineItems) {
      for (const line of di.lineItems) {
        const itemExists = items.find(i => i._id.toString() === (line.itemId?.toString() || ''));
        if (!itemExists) {
          // Find matching item
          const match = items.find(i => 
            (i.dynamicData?.tempCode && line.tempCode && i.dynamicData.tempCode === line.tempCode) ||
            (i.dynamicData?.name && line.itemName && i.dynamicData.name === line.itemName)
          );
          if (match) {
            line.itemId = match._id;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      await DI.updateOne({ _id: di._id }, { $set: { lineItems: di.lineItems } });
      updated++;
    }
  }
  console.log(`Fixed ${updated} DIs with orphaned item IDs`);
  process.exit(0);
});
