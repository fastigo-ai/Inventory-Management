const axios = require('axios');
axios.get('http://localhost:5000/api/v1/jmc').then(res => {
  const jmcs = res.data?.data || [];
  console.log("Total JMCs:", jmcs.length);
  const countsByStatus = {};
  jmcs.forEach(j => {
    countsByStatus[j.status] = (countsByStatus[j.status] || 0) + 1;
  });
  console.log("Status Counts:", countsByStatus);
  console.log("JMCs with Approved status:", jmcs.filter(j => j.status === 'Approved').map(j => ({ id: j.jmcNumber, items: j.items.length })));
}).catch(console.error);
