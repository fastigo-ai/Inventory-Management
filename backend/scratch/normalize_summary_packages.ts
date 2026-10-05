import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

const normalizePkg = (pkg: string): string => {
  if (!pkg) return '';
  let normalized = pkg.trim().replace(/\s+\(/g, '(').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  normalized = normalized.replace(/^package\s+(\d+)\((.+)\)$/i, (_, n, inner) =>
    `Package ${n}(${inner.toUpperCase()})`
  );
  return normalized;
};

const normalizeCircle = (circ: string): string => {
  if (!circ) return '';
  return circ.trim().charAt(0).toUpperCase() + circ.trim().slice(1).toLowerCase();
};

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    // 1. Find all summaries where package or circle need normalization
    const summaries = await db.collection('itemsummaries').find({}).toArray();
    
    let updatedCount = 0;
    let mergedCount = 0;

    for (const s of summaries) {
      const normalPkg = normalizePkg(s.package || '');
      const normalCirc = normalizeCircle(s.circle || '');
      
      if (normalPkg !== s.package || normalCirc !== s.circle) {
        // Check if a canonical version already exists
        const existing = await db.collection('itemsummaries').findOne({
          itemId: s.itemId,
          circle: normalCirc,
          package: normalPkg,
          _id: { $ne: s._id }
        });
        
        if (existing) {
          // Merge into the canonical record
          await db.collection('itemsummaries').updateOne(
            { _id: existing._id },
            { $inc: {
              loaQty: s.loaQty || 0,
              bomQty: s.bomQty || 0,
              diQty: s.diQty || 0,
              invQty: s.invQty || 0,
              actQty: s.actQty || 0,
              srtQty: s.srtQty || 0,
              billedQty: s.billedQty || 0,
              transferInQty: s.transferInQty || 0,
              transferOutQty: s.transferOutQty || 0,
              issuedQty: s.issuedQty || 0,
              returnedQty: s.returnedQty || 0,
            }}
          );
          // Delete the duplicate
          await db.collection('itemsummaries').deleteOne({ _id: s._id });
          mergedCount++;
        } else {
          // Just rename it
          await db.collection('itemsummaries').updateOne(
            { _id: s._id },
            { $set: { circle: normalCirc, package: normalPkg } }
          );
          updatedCount++;
        }
      }
    }
    
    console.log(`Done! Renamed ${updatedCount} records, merged & deleted ${mergedCount} duplicate records.`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
