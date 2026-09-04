import mongoose from 'mongoose';
import { buildStockSummaryData } from './src/modules/store/store.controller';

const URI = 'mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/test?appName=Cluster0';
mongoose.connect(URI).then(async () => {
  const summary = await buildStockSummaryData('Nahan', undefined, undefined);
  const t93 = summary.find((s: any) => s.tempCode === '93');
  console.log('TempCode 93:', t93);
  
  process.exit(0);
});
