require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const InwardEntry = mongoose.model('InwardEntry', new mongoose.Schema({}, { strict: false }));
  const ContractorIssue = mongoose.model('ContractorIssue', new mongoose.Schema({}, { strict: false }));
  const MhrOv = mongoose.model('MhrOv', new mongoose.Schema({}, { strict: false }));

  const circle = /Nahan/i;

  const inwards = await InwardEntry.find({
    circle: circle,
    $or: [
      { "items.loaSrNo": "1331" },
      { "items.itemName": /RABBIT CONDUCTOR/i }
    ]
  }).lean();

  let totalInwardQty = 0;
  for (const inward of inwards) {
    for (const item of inward.items || []) {
      if (item.loaSrNo === "1331" || (item.itemName && item.itemName.includes("RABBIT"))) {
         totalInwardQty += (Number(item.acceptedQty) || 0);
      }
    }
  }

  const mhrovs = await MhrOv.find({
    circle: circle,
    $or: [
      { "items.loaSrNo": "1331" },
      { "items.itemName": /RABBIT CONDUCTOR/i }
    ]
  }).lean();

  let totalMhrOvQty = 0;
  for (const mhrov of mhrovs) {
    for (const item of mhrov.items || []) {
      if (item.loaSrNo === "1331" || (item.itemName && item.itemName.includes("RABBIT"))) {
         totalMhrOvQty += (Number(item.acceptedQty) || 0);
      }
    }
  }
  
  const issues = await ContractorIssue.find({
    circle: circle,
    status: { $ne: 'Cancelled' },
    $or: [
      { "items.loaSrNo": "1331" },
      { "items.itemName": /RABBIT CONDUCTOR/i }
    ]
  }).lean();

  let totalIssuedQty = 0;
  for (const issue of issues) {
    for (const item of issue.items || []) {
      if (item.loaSrNo === "1331" || (item.itemName && item.itemName.includes("RABBIT"))) {
         totalIssuedQty += (Number(item.issueQty) || 0);
      }
    }
  }

  console.log("Total Inward Qty (Accepted):", totalInwardQty);
  console.log("Total MhrOv Qty (Accepted):", totalMhrOvQty);
  console.log("Total Issued Qty:", totalIssuedQty);
  console.log("Calculated Stock Balance:", (totalInwardQty + totalMhrOvQty) - totalIssuedQty);

  mongoose.disconnect();
}
main();
