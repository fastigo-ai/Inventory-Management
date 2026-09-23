const m = { selectedJmcs: ["66eed56cb623916298533c3f"] };
const availableJmcs = [{ _id: "66eed56cb623916298533c3f", items: [{ itemId: "abc", approvedQty: 5 }] }];
const selectedJmcIds = [m].flatMap(m => m.selectedJmcs);
let agg = [];
availableJmcs.forEach(jmc => {
  if (selectedJmcIds.includes(jmc._id)) {
    jmc.items.forEach(item => {
      agg.push({ jmcQty: Number(item.approvedQty) || Number(item.claimedQty) || 0 });
    });
  }
});
console.log(agg);
