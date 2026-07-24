const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/store/transfers', {
      requestDate: '2023-01-01',
      status: 'IN_TRANSIT',
      fromStore: 'Circle A',
      toStore: 'Circle B',
      vendorName: 'Test Vendor',
      minBookNo: 'B-1',
      minNo: 'M-1',
      minDate: '2023-01-01',
      challanNo: 'C-1',
      challanDate: '2023-01-01',
      transportName: 'Express',
      truckNumber: 'HR-11',
      grNumber: 'GR-11',
      grDate: '2023-01-01',
      driverName: 'John',
      driverMobile: '1234567890',
      remarks: 'Test',
      items: [{
        itemId: '654321654321654321654321', // mock objectId
        tempCode: 'T-1',
        description: 'Test Item',
        unit: 'Nos',
        requestedQty: 5,
        dispatchedQty: 5,
        receivedQty: 0
      }]
    });
    console.log("Success:", res.data);
  } catch(e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}
test();
