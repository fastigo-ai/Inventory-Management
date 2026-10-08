import axios from 'axios';

axios.get('http://localhost:5000/api/reports/item-summary', { params: { limit: 50000 } })
  .then(res => {
    const items = res.data.data.items.filter((i: any) => String(i.activity).includes('Augmentation DTR'));
    console.log("Total matched items from API:", items.length);
    items.forEach((i: any) => console.log(`- ${i.itemName} (Circle: ${i.circle})`));
  })
  .catch(console.error);
