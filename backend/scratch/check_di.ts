import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_URI = process.env.MONGO_URI || '';

async function main() {
  await mongoose.connect(DB_URI);
  
  const DI = mongoose.connection.collection('dis');
  
  const di = await DI.findOne({ diNumber: '5135-57' });
  
  if (di) {
    console.log(`DI Found: ${di.diNumber}`);
    console.log('Line Items:');
    di.lineItems.forEach((li: any) => {
       console.log(`- Serial: ${li.loaSerialNo}, Name: ${li.itemName}, Circle: ${li.circle}, TempCode: ${li.tempCode}`);
    });
  } else {
    console.log('DI 5135-57 not found');
  }

  process.exit(0);
}

main().catch(console.error);
