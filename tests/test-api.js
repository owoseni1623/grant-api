// test-api.js
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Base URL for API
const API_URL = 'https://grant-api.onrender.com';

// Test admin login
async function testAdminLogin() {
  try {
    console.log('Testing admin login...');
    const response = await axios.post(`${API_URL}/api/admin/login`, {
      username: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    
    console.log('Login successful!');
    console.log('Token:', response.data.token);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    return null;
  }
}

// Test get applications
async function testGetApplications(token) {
  try {
    console.log('\nTesting get applications...');
    const response = await axios.get(`${API_URL}/api/admin/applications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Applications fetched successfully!');
    console.log(`Found ${response.data.length} applications`);
    return response.data;
  } catch (error) {
    console.error('Fetch applications failed:', error.response?.data || error.message);
    return null;
  }
}

// Test verify token
async function testVerifyToken(token) {
  try {
    console.log('\nTesting token verification...');
    const response = await axios.get(`${API_URL}/api/admin/verify-token`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Token verification successful!');
    console.log('Result:', response.data);
    return true;
  } catch (error) {
    console.error('Token verification failed:', error.response?.data || error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('Starting API tests...');
  
  // First test login
  const token = await testAdminLogin();
  if (!token) {
    console.log('Tests aborted due to login failure.');
    return;
  }
  
  // Test token verification
  const tokenValid = await testVerifyToken(token);
  if (!tokenValid) {
    console.log('Tests aborted due to token verification failure.');
    return;
  }
  
  // Test get applications
  const applications = await testGetApplications(token);
  if (!applications) {
    console.log('Failed to fetch applications.');
    return;
  }
  
  // If we have applications, test status update for first one
  if (applications.length > 0) {
    const appId = applications[0]._id;
    try {
      console.log(`\nTesting status update for application ${appId}...`);
      const newStatus = applications[0].status === 'PENDING' ? 'APPROVED' : 'PENDING';
      
      const response = await axios.put(
        `${API_URL}/api/admin/applications/${appId}/status`,
        { status: newStatus },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('Status update successful!');
      console.log('New status:', response.data.application.status);
    } catch (error) {
      console.error('Status update failed:', error.response?.data || error.message);
    }
  }
  
  console.log('\nAPI tests completed.');
}

// Run the tests
runTests();