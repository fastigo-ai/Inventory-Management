import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Item from '../modules/items/item.model';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkLoaRows = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);

    // Let's check what circle has SKU 1460, 1461, etc.
    // Notice earlier investigateRows showed:
    // SKU 1460, 1461, 1462, 1463, 1464, 1465, 1466 belong to SOLAN!
    // Why did the user's excel sheet have 1460 at row 1460?
    // Could it be that the Excel sheet had LOA Serial No / S.No. = 1460 in column A?
    const skus = ['1460', '1461', '1474', '1475', '1481'];
    const items = await Item.find({ 'dynamicData.sku': { $in: skus } }).lean();
    console.log('Items matching SKUs:');
    items.forEach((it: any) => {
      console.log({
        sku: it.dynamicData?.sku,
        circle: it.dynamicData?.circle,
        desc: it.dynamicData?.description
      });
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkLoaRows();
