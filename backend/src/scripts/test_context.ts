import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/demand-notes/context', {
      params: {
        itemId: '66a15291b8f4ed73cfcd4ef2', // Example item id from screenshot or just anything.
        contractorName: 'Package 1(S/N)', // Let's just find a real item in JMC.
      }
    });
    console.log(res.data);
  } catch (err: any) {
    console.log('Error:', err.response?.data || err.message);
  }
}

test();
