import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const testStock = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  
  const Item = mongoose.connection.model('Item', new mongoose.Schema({}, { strict: false }));
  
  const items = await Item.find({ isDeleted: false, 'dynamicData.circle': 'Rohru' }).lean();
  console.log("Total items:", items.length);
  
  const summaryMap = {};
  items.forEach(item => {
    const data = item.dynamicData || {};
    const tempCode = data.tempCode || data.temp_code || '';
    const activity = data.activity || data.itemActivity || 'Uncategorized Activity';
    const loaSrNo = data.loaSrNo || data.loaSerialNo || data.loaSerialNumber || data.sku || '';
    
    if (tempCode == '87') {
      if (!summaryMap[tempCode]) {
        summaryMap[tempCode] = {
          tempCode,
          allActivities: new Set(),
          allLoaSrs: new Set(),
          activityDetailsMap: {}
        };
      }
      if (activity) {
        summaryMap[tempCode].allActivities.add(activity);
        if (!summaryMap[tempCode].activityDetailsMap[activity]) {
          summaryMap[tempCode].activityDetailsMap[activity] = {
            itemId: item._id,
            loaSrNo,
            description: data.name
          };
        }
      }
      if (loaSrNo) summaryMap[tempCode].allLoaSrs.add(loaSrNo);
    }
  });
  
  console.log("Summary for 87:", JSON.stringify({
    ...summaryMap['87'],
    allActivities: Array.from(summaryMap['87']?.allActivities || []),
    allLoaSrs: Array.from(summaryMap['87']?.allLoaSrs || [])
  }, null, 2));
  
  process.exit(0);
};

testStock();
