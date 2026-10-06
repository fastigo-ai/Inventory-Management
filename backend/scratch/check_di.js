const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/erp-system');
const DI = require('./src/modules/di/di.schema').default || require('./src/modules/di/di.schema');
async function test() {
  const di = await DI.findOne({ diNumber: '20322' }).lean();
  console.log(JSON.stringify(di, null, 2));
  process.exit();
}
test();
