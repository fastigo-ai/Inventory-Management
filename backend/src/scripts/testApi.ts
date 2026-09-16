import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/v1/reports/site-contractor-summary?contractorId=ALL&circle=Nahan');
    const data = res.data.data.items || res.data.data;
    const actItems = data.filter((row: any) => row.activity && row.activity.includes('New HT-LT DTRs Work- New 11kV on STP with Rabbit-50 Sqmm'));
    console.log(`API returned ${actItems.length} items for this activity.`);
    if (actItems.length > 0) {
      console.log('First item:', actItems[0]);
    }
  } catch (err: any) {
    console.error('Error fetching API:', err.response?.data || err.message);
  }
}
test();
