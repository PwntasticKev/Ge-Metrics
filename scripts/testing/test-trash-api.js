// Test script to verify trash API works
const testTrashAPI = async () => {
  // First, login to get a token
  const loginResponse = await fetch('http://localhost:8000/trpc/auth.login?batch=1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': 'test-token',
      'Origin': 'http://localhost:8000',
      'Referer': 'http://localhost:8000/'
    },
    body: JSON.stringify({
      "0": {
        "json": {
          "email": "user@ge-metrics-test.com",
          "password": "password123"
        }
      }
    })
  });

  const loginData = await loginResponse.json();
  console.log('Login response:', loginData);
  
  if (loginData[0]?.result?.data?.json?.accessToken) {
    const token = loginData[0].result.data.json.accessToken;
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // Now test the trash marking
    const trashResponse = await fetch('http://localhost:8000/trpc/trash.markItem?batch=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-csrf-token': 'test-token',
        'Origin': 'http://localhost:8000',
        'Referer': 'http://localhost:8000/'
      },
      body: JSON.stringify({
        "0": {
          "json": {
            "itemId": 29628,
            "itemName": "Armageddon cape fabric"
          }
        }
      })
    });

    const trashData = await trashResponse.json();
    console.log('Trash marking response:', trashData);
    
    if (trashData[0]?.result?.data?.json?.success) {
      console.log('✅ SUCCESS: Trash marking works!');
    } else {
      console.log('❌ FAILED: Trash marking failed', trashData[0]?.error);
    }
  } else {
    console.log('❌ Login failed:', loginData[0]?.error);
  }
};

testTrashAPI().catch(console.error);