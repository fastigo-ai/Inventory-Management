import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/v1/summary/site-contractor-summary?contractorId=ALL&circle=Nahan');
    const data = res.data.data.items || res.data.data;
    const activities = new Set(data.map((row: any) => row.activity));
    console.log(`API returned ${activities.size} activities.`);
    console.log(`Array:`, Array.from(activities));
  } catch (err: any) {
    console.error('Error fetching API:', err.response?.data || err.message);
  }
}
test();
