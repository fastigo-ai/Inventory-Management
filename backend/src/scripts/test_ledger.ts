import axios from 'axios';

async function testLedger() {
  try {
    const res = await axios.get('http://localhost:5000/api/reports/item-ledger?tempCode=69&circle=Nahan');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}
testLedger();
