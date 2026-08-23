const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.MONGO_URI;

async function testAggregation() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const pipeline = [
    { $unwind: "$lineItems" },
    {
      $group: {
        _id: "$lineItems.tempCode",
        itemName: { $first: "$lineItems.itemName" },
        piQuantity: { $sum: { $toDouble: "$lineItems.quantity" } }
      }
    },
    {
      $lookup: {
        from: "storeinwardentries",
        let: { tempCode: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$tempCode", "$$tempCode"] },
              status: { $nin: ["DRAFT", "PENDING_RECEIPT"] } // IR done means it's verified/received
            }
          },
          {
            $group: {
              _id: null,
              irQuantity: { $sum: { $toDouble: "$invoiceQty" } }
            }
          }
        ],
        as: "irData"
      }
    },
    {
      $project: {
        tempCode: "$_id",
        itemName: 1,
        piQuantity: 1,
        irQuantity: { $ifNull: [{ $arrayElemAt: ["$irData.irQuantity", 0] }, 0] },
        _id: 0
      }
    },
    { $sort: { tempCode: 1 } },
    { $limit: 10 }
  ];

  const results = await db.collection('purchaseinvoices').aggregate(pipeline).toArray();
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

testAggregation();
