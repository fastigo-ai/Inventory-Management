import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import mongoose from 'mongoose';
import { ItemSummary } from '../src/modules/reports/summary/summary.schema';

mongoose.connect("mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0").then(async () => {
  const summaries = await ItemSummary.find({ itemId: "6a8299025d7ee9d212355423" }).lean();
  console.log("Summary for LT 3.5X95 SQMM CABLE:", summaries);
  process.exit();
});
