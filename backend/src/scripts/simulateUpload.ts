import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const simulateUpload = async () => {
  try {
    const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
    if (!fs.existsSync(filePath)) {
      console.error('File not found at:', filePath);
      return;
    }

    const form = new FormData();
    form.append('files', fs.createReadStream(filePath));
    form.append('conflictStrategy', 'skip');

    console.log('Sending upload request to backend...');
    const startTime = Date.now();
    
    // You might need a token if the route is protected.
    // If it's protected, this will return 401 Unauthorized, which is fine, we'll see it immediately.
    // I can generate a token or try bypassing it.
    // But let's see what it returns first.
    
    // I'll get an admin token to be sure.
    // Wait, let's login first if needed.
    // Let's just try the request first.
    
    const response = await axios.post('http://localhost:5000/api/jmc/upload', form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 120000 // 2 minutes
    });

    console.log(`Success! Time taken: ${(Date.now() - startTime) / 1000}s`);
    console.log(response.data);

  } catch (error: any) {
    if (error.response) {
      console.error(`Request failed with status ${error.response.status}`);
      console.error(error.response.data);
    } else {
      console.error('Request failed:', error.message);
    }
  }
};

simulateUpload();
