const fetch = require('node-fetch');

// Test superadmin login and banner delete
async function testSuperadminBannerDelete() {
  console.log('🧪 Testing Superadmin Banner Delete...\n');

  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

    // Step 1: Login as superadmin
    console.log('1. Logging in as superadmin...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@example.com',
        password: 'password123'
      })
    });

    console.log('   Login status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('   Login response:', JSON.stringify(loginData, null, 2));

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    // Extract session ID from response for manual header-based auth
    const sessionId = loginData.session?.user_id;
    console.log('   Session ID:', sessionId);

    // Step 2: Check authentication status
    console.log('\n2. Checking authentication status...');
  const authResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        'x-session-id': sessionId
      }
    });
    const authData = await authResponse.json();
    console.log('   Auth status:', authData);

    if (!authData.authenticated) {
      console.log('❌ Not authenticated');
      return;
    }

    // Step 3: Get banners
    console.log('\n3. Getting banners...');
  const bannersResponse = await fetch(`${baseUrl}/api/banners`, {
      headers: {
        'x-session-id': sessionId
      }
    });
    console.log('   Banners status:', bannersResponse.status);

    if (bannersResponse.status === 401) {
      console.log('❌ Authentication failed for banners endpoint');
      return;
    }

    const banners = await bannersResponse.json();
    console.log('   Found banners:', banners.length);

    if (banners.length === 0) {
      console.log('   No banners to test delete. Creating a test banner first...');

      // Create a test banner
  const createResponse = await fetch(`${baseUrl}/api/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          title: 'Test Banner for Delete',
          description: 'This is a test banner to test delete functionality',
          image_url: 'https://example.com/test.jpg',
          is_active: true,
          priority: 1
        })
      });

      console.log('   Create banner status:', createResponse.status);
      if (createResponse.ok) {
        const newBanner = await createResponse.json();
        console.log('   Created test banner:', newBanner.id);

        // Now try to delete it
        console.log('\n4. Testing DELETE on test banner...');
  const deleteResponse = await fetch(`${baseUrl}/api/banners/${newBanner.id}`, {
          method: 'DELETE',
          headers: {
            'x-session-id': sessionId
          }
        });
        console.log('   Delete status:', deleteResponse.status);
        const deleteResult = await deleteResponse.text();
        console.log('   Delete response:', deleteResult);

        if (deleteResponse.ok) {
          console.log('✅ Delete successful!');
        } else {
          console.log('❌ Delete failed');
        }
      } else {
        console.log('   Failed to create test banner:', await createResponse.text());
      }
    } else {
      // Test delete on existing banner
      const testBanner = banners[0];
      console.log('\n4. Testing DELETE on existing banner:', testBanner.id);
  const deleteResponse = await fetch(`${baseUrl}/api/banners/${testBanner.id}`, {
        method: 'DELETE',
        headers: {
          'x-session-id': sessionId
        }
      });
      console.log('   Delete status:', deleteResponse.status);
      const deleteResult = await deleteResponse.text();
      console.log('   Delete response:', deleteResult);

      if (deleteResponse.ok) {
        console.log('✅ Delete successful!');
      } else {
        console.log('❌ Delete failed');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSuperadminBannerDelete();
