// Test trash button functionality directly
const testTrashButton = async () => {
  try {
    const response = await fetch('http://localhost:8000/trpc/trash.markItem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': document.cookie // Include session cookies
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

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('Success:', data);
    } else {
      console.error('Error response:', responseText);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
};

// Run the test
testTrashButton();