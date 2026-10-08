const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const ItemSummary = require('./src/modules/reports/summary/summary.model').default;
  const res = await ItemSummary.aggregate([
    { $limit: 100 },
    { $lookup: {
        from: 'dis',
        localField: 'itemId',
        foreignField: 'lineItems.itemId',
        pipeline: [
          { $sort: { date: -1 } },
          { $limit: 1 }
        ],
        as: 'latestDI'
      }
    },
    { $unwind: { path: '$latestDI', preserveNullAndEmptyArrays: true } },
    { $match: { latestDI: { $ne: null } } }
  ]);
  console.log(res.length, "summaries matched a DI.");
  if (res.length > 0) {
    console.log(res[0].latestDI.diNumber);
  }
  process.exit(0);
});
