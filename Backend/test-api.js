import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...');
    
    // Test health check
    console.log('\n📡 Testing health check...');
    const healthResponse = await fetch('http://localhost:5000/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test study plans endpoint (this will fail without auth, but we can see if route exists)
    console.log('\n📡 Testing study plans endpoint...');
    const studyResponse = await fetch('http://localhost:5000/api/study/plans');
    console.log('📊 Study plans response status:', studyResponse.status);
    console.log('📊 Study plans response:', studyResponse.statusText);
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

testAPI();