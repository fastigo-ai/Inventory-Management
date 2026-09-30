require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');

async function updateNames() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const names = require('./rampur_names.json');
  
  let updated = 0;
  let notFound = 0;
  
  for (const [tempCodeStr, newName] of Object.entries(names)) {
    let code = tempCodeStr.trim();
    const isNum = !isNaN(Number(code));
    const query = isNum ? { 'dynamicData.tempCode': { $in: [Number(code), code] } } : { 'dynamicData.tempCode': code };

    const res = await db.collection('items').updateMany(
      query,
      { $set: { 'dynamicData.name': newName, 'dynamicData.description': newName } }
    );
    
    if (res.modifiedCount > 0) {
      updated += res.modifiedCount;
    } else {
      notFound++;
    }
  }
  
  console.log('Items updated:', updated);
  console.log('Temp Codes with no changes / not found:', notFound);
  process.exit(0);
}

updateNames();
