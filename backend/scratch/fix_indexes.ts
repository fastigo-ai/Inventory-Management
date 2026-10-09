import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:pass@ac-clx6mva-shard-00-00.lgbl4nv.mongodb.net/fastigo-inventory?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB');

  try {
    await mongoose.connection.collection('mhrovs').dropIndex('mhrovNumber_1');
    console.log('Successfully dropped old unique index on mhrovNumber');
  } catch (err: any) {
    console.log('Error dropping index (it may not exist):', err.message);
  }
  
  try {
    await mongoose.connection.collection('mhrovs').createIndex({ mhrovNumber: 1, circle: 1 }, { unique: true });
    console.log('Successfully created new compound unique index on mhrovNumber and circle');
  } catch (err: any) {
    console.log('Error creating new index:', err.message);
  }

  process.exit(0);
}

main().catch(console.error);
