const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/ho-billing/contractor-work-orders/6ab2ceb3adf3db1e37237ff9/handover', {
      assignments: [{ itemIndex: 0, contractorId: '6ab1b8d2adf3db1e37237e89' }], // dummy
      materialDisposition: 'TRANSFER_TO_NEW_CONTRACTOR'
    }, {
      headers: {
        // Need to bypass auth or pass token? The user showed auth header!
        // Let's use the exact auth header from the user's request.
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNjFlNzFkYmE4NTk2ZmQyODFjODg4MiIsImVtYWlsIjoicmFodWxAZ21haWwuY29tIiwic2Vzc2lvblZlcnNpb24iOjAsImlhdCI6MTc5MDA5NzQwMSwiZXhwIjoxNzkwMTgzODAxfQ.p3eCsc-QZsec2isdJ0QqFy3tx0ur5kL_rE3WtiFMMOk'
      }
    });
    console.log(res.data);
  } catch (error) {
    if (error.response) {
      console.log('Error Data:', error.response.data);
    } else {
      console.error(error);
    }
  }
}
test();
