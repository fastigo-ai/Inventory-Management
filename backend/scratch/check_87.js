const mongoose = require('mongoose');
const { Item } = require('./src/modules/store/item.schema');
const { StoreTransaction } = require('./src/modules/store/storeTransaction.schema');
const ContractorWorkOrder = require('./src/modules/contractors/contractorWorkOrder.schema');

async function check() {
  await mongoose.connect('mongodb+srv://developer:6hOq88rS99N7z0Q9@erp-db.lgbl4nv.mongodb.net/fastigo-erp?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  
  // Just simulate the loop for TempCode 87
  const items = await Item.find({ isDeleted: false, circle: 'Rohru', package: 'Package 2(R/R)' });
  
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
  process.exit(0);
}
check();
