require('dotenv').config({path: '.env'});
const mongoose = require('mongoose');

async function checkRecentImports() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  // Look at the last 60 minutes just in case
  const timeAgo = new Date(Date.now() - 60 * 60 * 1000); 
  
  const newlyCreated = await db.collection('items').countDocuments({ createdAt: { $gte: timeAgo } });
  const recentlyUpdated = await db.collection('items').countDocuments({ updatedAt: { $gte: timeAgo } });
  
  console.log('Items created in last 60 mins:', newlyCreated);
  console.log('Items updated in last 60 mins (includes newly created):', recentlyUpdated);
  
  const newItems = await db.collection('items').find({ createdAt: { $gte: timeAgo } }).limit(5).toArray();
  console.log('\nSample of new items inserted:');
  newItems.forEach(i => console.log(`- ${i.dynamicData?.name || i.dynamicData?.description} (TempCode: ${i.dynamicData?.tempCode}, SKU: ${i.dynamicData?.sku})`));
  
  const updatedItems = await db.collection('items').find({ updatedAt: { $gte: timeAgo }, createdAt: { $lt: timeAgo } }).limit(5).toArray();
  console.log('\nSample of existing items updated via import:');
  updatedItems.forEach(i => console.log(`- ${i.dynamicData?.name || i.dynamicData?.description} (TempCode: ${i.dynamicData?.tempCode}, SKU: ${i.dynamicData?.sku})`));
  
  process.exit(0);
}

checkRecentImports();
