// Simple test to verify the trash endpoint is reachable
const testSimpleTrash = async () => {
  try {
    // First test if the endpoint exists
    const response = await fetch('http://localhost:4000/trpc/trash.markItem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'test-token',
        'Origin': 'http://localhost:8000',
        'Referer': 'http://localhost:8000/'
      },
      body: JSON.stringify({
        json: {
          itemId: 29628,
          itemName: "Armageddon cape fabric"
        }
      })
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
};

testSimpleTrash();