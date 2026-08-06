require('mongoose').connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority').then(async () => {
  const PI = require('mongoose').model('PI', new require('mongoose').Schema({}, {strict: false}), 'purchaseinvoices');
  const DI = require('mongoose').model('DI', new require('mongoose').Schema({}, {strict: false}), 'dis');
  const ItemSummary = require('mongoose').model('ItemSummary', new require('mongoose').Schema({}, {strict: false}), 'itemsummaries');
  
  const dis = await DI.find({ diNumber: 'CEO/MM/RDSS/Loss reduction/2024-25/-22990-99' }).lean();
  const diIds = dis.map(d => d._id);
  const pis = await PI.find({ 'lineItems.diId': { $in: diIds } }).lean();
  
  console.log('PIs found:', pis.length);
  
  const itemIds = new Set();
  pis.forEach(pi => pi.lineItems?.forEach(line => {
    if (line.itemId) itemIds.add(line.itemId.toString());
  }));
  
  console.log('Unique items in PIs:', itemIds.size);
  
  const summaries = await ItemSummary.find({ itemId: { $in: Array.from(itemIds) } }).lean();
  console.log('Summaries for these items:');
  summaries.forEach(s => {
    console.log(`Item: ${s.itemId}, Circle: ${s.circle}, Package: ${s.package}, BilledQty: ${s.billedQty}, DIQty: ${s.diQty}`);
  });
  
  process.exit(0);
});
