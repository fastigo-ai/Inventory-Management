import mongoose from 'mongoose';
import { buildStockSummaryData } from './src/modules/store/store.controller';

const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const summary = await buildStockSummaryData('Nahan', undefined, undefined);
  const itemsWithStock = summary.filter((s: any) => s.totalBalanceQty > 0);
  console.log(`Found ${itemsWithStock.length} items with positive stock out of ${summary.length} total items in Nahan`);
  
  itemsWithStock.slice(0, 3).forEach((s: any) => {
    console.log(`- tempCode: ${s.tempCode} (${s.description}): Balance = ${s.totalBalanceQty}`);
  });
  
  process.exit(0);
});
