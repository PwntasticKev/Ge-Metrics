// Direct trash functionality test
import fetch from 'node-fetch';

async function testTrashButton() {
  try {
    console.log('🚀 Testing trash button directly...');
    
    // First login to get a token
    const loginResponse = await fetch('http://localhost:4000/trpc/auth.login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

    if (!loginData[0]?.result?.data?.user?.accessToken) {
      console.error('❌ Failed to get access token');
      return;
    }

    const token = loginData[0].result.data.user.accessToken;
    console.log('✅ Got access token');

    // Now test the trash button
    const trashResponse = await fetch('http://localhost:4000/trpc/trash.markItem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        "0": {
          "json": {
            "itemId": 1234,
            "itemName": "Test Item"
          }
        }
      })
    });

    console.log('Trash response status:', trashResponse.status);
    console.log('Trash response headers:', Object.fromEntries(trashResponse.headers.entries()));
    
    const responseText = await trashResponse.text();
    console.log('Raw trash response:', responseText);
    
    if (trashResponse.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Trash button SUCCESS:', data);
    } else {
      console.error('❌ Trash button FAILED:', responseText);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testTrashButton();