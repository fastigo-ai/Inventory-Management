import mongoose from 'mongoose';
import Item from '../src/modules/items/item.model';

const MONGO_URI = "mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/doortwofy?retryWrites=true&w=majority";

async function checkItem() {
  await mongoose.connect(MONGO_URI);
  const item = await Item.findOne().lean();
  console.log('Item:', JSON.stringify(item, null, 2));
  process.exit(0);
}
checkItem();
