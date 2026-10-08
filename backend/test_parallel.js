const axios = require('axios');

async function run() {
  console.log("Starting parallel requests");
  
  // Note: Since we don't have a valid token, we'll get 401, but the connection behavior is what we're testing.
  // Wait, if it's 401, the controller won't execute the heavy query!
  // We need to bypass auth or get a real token.
  
}
run();
