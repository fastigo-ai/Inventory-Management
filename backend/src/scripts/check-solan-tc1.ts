import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { ItemSummary } from '../modules/reports/summary/summary.schema';
import axios from 'axios';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const docs = await ItemSummary.find({ circle: 'Solan', tempCode: '1' }).lean();
  console.log('Count of items for TC 1 in Solan (ItemSummary):', docs.length);
  const sumInv = docs.reduce((a, b) => a + (b.invQty || 0), 0);
  const sumDi = docs.reduce((a, b) => a + (b.diQty || 0), 0);
  const sumLoa = docs.reduce((a, b) => a + (b.loaQty || 0), 0);
  const sumBom = docs.reduce((a, b) => a + (b.bomQty || 0), 0);
  console.log('ItemSummary sums:', { sumLoa, sumBom, sumDi, sumInv });
  for (const d of docs) {
    console.log('loaSrNo:', d.loaSerialNo, 'invQty:', d.invQty, 'diQty:', d.diQty, 'loaQty:', d.loaQty);
  }

  // Also check item-matrix-summary
  const res = await axios.get('http://localhost:5000/reports/item-matrix-summary', {
    params: { circle: 'Solan', limit: 50000 }
  });
  const matrixItems = (res.data?.data?.items || []).filter((x: any) => x.tempCode === '1');
  console.log('\nMatrix items for TC 1 in Solan:', matrixItems.length);
  const mSumInv = matrixItems.reduce((a: number, b: any) => a + (b.inwardSolan || 0), 0);
  const mSumDi = matrixItems.reduce((a: number, b: any) => a + (b.dispatchedSolan || 0), 0);
  const mSumLoa = matrixItems.reduce((a: number, b: any) => a + (b.solanLoaQty || 0), 0);
  const mSumBom = matrixItems.reduce((a: number, b: any) => a + (b.solanBomQty || 0), 0);
  console.log('Matrix sums for Solan TC 1:', { mSumLoa, mSumBom, mSumDi, mSumInv });
  for (const d of matrixItems) {
    console.log('matrix loaSrNo:', d.loaSerialNo, 'inwardSolan:', d.inwardSolan, 'dispatchedSolan:', d.dispatchedSolan, 'solanLoaQty:', d.solanLoaQty);
  }

  await mongoose.disconnect();
}
check().catch(console.error);
