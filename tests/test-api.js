const axios = require('axios');

// Change this to your actual backend URL
const API_URL = 'https://grant-api.onrender.com';

async function testAPIEndpoints() {
  console.log('Testing API endpoints...');
  
  try {
    // Test basic connectivity
    console.log('\nTesting basic connectivity...');
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Basic connectivity working:', response.data);
  } catch (error) {
    console.error('❌ Basic connectivity failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
  
  try {
    // Test admin login route existence (not the actual login)
    console.log('\nTesting admin login route existence...');
    // We're just checking the OPTIONS request to see if the route exists
    await axios.options(`${API_URL}/api/admin/login`);
    console.log('✅ Admin login route exists');
  } catch (error) {
    console.error('❌ Admin login route check failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
  
  console.log('\nAPI endpoint tests completed.');
}

testAPIEndpoints();