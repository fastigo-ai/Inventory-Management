const mongoose = require('mongoose');
const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const { buildStockSummaryData } = require('./src/modules/store/store.controller');
  
  const summary = await buildStockSummaryData('Nahan', undefined, undefined);
  const itemsWithStock = summary.filter(s => s.totalBalanceQty > 0);
  console.log(`Found ${itemsWithStock.length} items with positive stock out of ${summary.length} total items in Nahan`);
  
  itemsWithStock.slice(0, 3).forEach(s => {
    console.log(`- ${s.tempCode} (${s.description}): Balance = ${s.totalBalanceQty}`);
  });
  
  process.exit(0);
});
