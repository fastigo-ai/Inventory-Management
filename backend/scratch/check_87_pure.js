const { MongoClient } = require('mongodb');

async function check() {
  const uri = 'mongodb+srv://developer:6hOq88rS99N7z0Q9@erp-db.lgbl4nv.mongodb.net/fastigo-erp?retryWrites=true&w=majority';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  const items = await db.collection('items').find({ isDeleted: false, circle: 'Rohru', package: 'Package 2(R/R)' }).toArray();
  
  const summaryMap = {};
  items.forEach(item => {
    const data = item.dynamicData || {};
    const tempCode = data.tempCode || '';
    if (tempCode !== '87') return;
    
    if (!summaryMap[tempCode]) {
      summaryMap[tempCode] = {
        itemId: item._id,
        tempCode: tempCode,
        activityDetailsMap: {},
        allActivities: new Set(),
        allLoaSrs: new Set()
      };
    }
    
    const activity = data.activity || data.itemActivity || 'Uncategorized Activity';
    const loaSrNo = data.sku || data.loaSrNo || '';
    
    if (activity) {
      summaryMap[tempCode].allActivities.add(activity);
      if (!summaryMap[tempCode].activityDetailsMap[activity]) {
        summaryMap[tempCode].activityDetailsMap[activity] = [];
      }
      summaryMap[tempCode].activityDetailsMap[activity].push({
        itemId: item._id.toString(),
        loaSrNo: loaSrNo,
        description: data.name || data.description || '-'
      });
    }
    if (loaSrNo) summaryMap[tempCode].allLoaSrs.add(loaSrNo);
  });
  
  if (summaryMap['87']) {
     summaryMap['87'].allActivities = Array.from(summaryMap['87'].allActivities);
     summaryMap['87'].allLoaSrs = Array.from(summaryMap['87'].allLoaSrs);
  }
  
  console.log(JSON.stringify(summaryMap['87'], null, 2));
  await client.close();
  process.exit(0);
}
check();
