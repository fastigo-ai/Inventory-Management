require('mongoose').connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?retryWrites=true&w=majority').then(async () => {
  const PI = require('mongoose').model('PI', new require('mongoose').Schema({}, {strict: false}), 'purchaseinvoices');
  const dis = await require('mongoose').model('DI', new require('mongoose').Schema({}, {strict: false}), 'dis').find({ diNumber: 'CEO/MM/RDSS/Loss reduction/2024-25/-22990-99' }).lean();
  const pis = await PI.find({ 'lineItems.diId': { $in: dis.map(d=>d._id) } }).lean();
  let itemId;
  pis.forEach(pi => pi.lineItems?.forEach(line => { if(line.itemId) itemId = line.itemId; }));
  
  console.log('Rebuilding for item:', itemId);
  
  // Register all required schemas so SummaryService doesn't fail
  require('./src/modules/items/item.schema');
  require('./src/modules/di/di.schema');
  require('./src/modules/purchases/pr.schema');
  require('./src/modules/purchases/purchaseInvoice.schema');
  require('./src/modules/store/store.schema');
  require('./src/modules/reports/summary/itemSummary.schema');
  
  const { SummaryService } = require('./src/modules/reports/summary/summary.service');
  try {
    await SummaryService.rebuildForItem(itemId.toString());
    console.log('Rebuild done.');
  } catch (e) {
    console.error('Error rebuilding:', e);
  }
  process.exit(0);
});
