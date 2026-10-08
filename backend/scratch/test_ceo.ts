import mongoose from 'mongoose';
import { buildCeoDashboardSummary } from '../src/modules/dashboard/ceoDashboard.service';

async function run() {
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  const res = await buildCeoDashboardSummary({ circle: 'Nahan', package: 'Package 1 (S/N)' });
  console.log(JSON.stringify(res.kpis, null, 2));
  process.exit(0);
}
run();
