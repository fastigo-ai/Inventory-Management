const axios = require('axios');

async function run() {
  try {
    const res = await axios.get('http://localhost:5000/api/store/stock-summary?circle=Nahan');
    const data = res.data.data;
    
    console.log("=== STOCK SUMMARY FOR NAHAN ===");
    data.filter(s => s.totalBalanceQty > 0 || s.tempCode === "7" || s.tempCode === "20" || s.tempCode === "1").forEach(s => {
      console.log(`TempCode: ${s.tempCode}, Item: ${s.description}, Inward (Total): ${s.receivedQty}, Available: ${s.totalBalanceQty}`);
    });
  } catch (err) {
    console.error(err.message);
  }
}
run();
