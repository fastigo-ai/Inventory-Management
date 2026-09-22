// test_frontend.js
const fs = require('fs');
const path = require('path');

// Simulate the frontend logic
const stockSummary = [
  {
    itemId: '764_id',
    tempCode: '87',
    description: 'First item 764',
    loaSrNo: '764',
    allActivities: ['New HT Line Work', 'Feeder Segregation HT Line Work-22 KV New Line STP with Dog Conductor'],
    allLoaSrs: ['764', '1307', '1312'],
    totalBalanceQty: 10,
    unit: 'Nos',
    activityDetailsMap: {
      'New HT Line Work': [
        { itemId: '764_id', description: 'desc 764', loaSrNo: '764' }
      ],
      'Feeder Segregation HT Line Work-22 KV New Line STP with Dog Conductor': [
        { itemId: '1307_id', description: 'desc 1307', loaSrNo: '1307' },
        { itemId: '1312_id', description: 'desc 1312', loaSrNo: '1312' }
      ]
    }
  }
];

const loadedItems = [
  { itemId: '1301_id', activity: 'Feeder Segregation HT Line Work-22 KV New Line STP with Dog Conductor' },
  { itemId: '764_id', activity: 'New HT Line Work' } // Simulate they ALREADY issued 764
];

const existingItemIds = new Set(loadedItems.map(i => i.itemId).filter(Boolean));
const activeActivities = ['Feeder Segregation HT Line Work-22 KV New Line STP with Dog Conductor'];
const autoAddedItems = [];

activeActivities.forEach(activity => {
  const itemsForActivity = stockSummary.filter(s => 
    (s.allActivities && s.allActivities.includes(activity)) || s.activity === activity
  );
  
  itemsForActivity.forEach((s) => {
    const details = s.activityDetailsMap?.[activity];
    const detailsArray = Array.isArray(details) ? details : (details ? [details] : [
      { itemId: s.itemId, description: s.description, loaSrNo: (s.allLoaSrs && s.allLoaSrs.length > 0 ? s.allLoaSrs[0] : (s.loaSrNo || "")) }
    ]);
    
    detailsArray.forEach((detail) => {
      if (!existingItemIds.has(detail.itemId)) {
         autoAddedItems.push({
            itemId: detail.itemId,
            itemName: detail.description,
            tempCode: s.tempCode || s.itemCode || '',
            loaSrNo: detail.loaSrNo,
            activity: activity,
         });
         existingItemIds.add(detail.itemId);
      }
    });
  });
});

console.log(JSON.stringify(autoAddedItems, null, 2));
