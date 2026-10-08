import axios from 'axios';

axios.get('http://localhost:5000/api/reports/item-summary', { params: { limit: 50000 } })
  .then(res => {
    const items = res.data.data.items.filter((i: any) => String(i.activity).trim() === 'Augmentation DTR Work-11/0.4 KV-400 KVA to 630 KV');
    console.log("Exact matched items from API:", items.length);
    items.forEach((i: any) => console.log(`- ${i.itemName} (Circle: ${i.circle}, Package: ${i.package})`));
  })
  .catch(console.error);
