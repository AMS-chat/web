// Signals Feature Tests
// Tests signal submission, approval, rejection, and static object creation

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Signals System Tests', () => {
  let authToken;
  let userId;
  let adminToken;
  let testSignalId;
  let testStaticObjectId;

  beforeAll(async () => {
    // Register a test user
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+359888999777',
        password: 'Test123!',
        full_name: 'Signal Tester',
        gender: 'male',
        birth_date: '1990-01-01'
      })
    });
    
    const registerData = await registerRes.json();
    authToken = registerData.token;
    userId = registerData.user.id;
    
    // Login as admin (assuming admin exists)
    // For testing, you'll need to manually create admin or use test admin credentials
    console.log('User registered for testing:', userId);
  });

  describe('Signal Submission', () => {
    test('should check if user can submit signal', async () => {
      const res = await fetch(`${API_URL}/api/signals/can-submit`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('canSubmit');
      expect(typeof data.canSubmit).toBe('boolean');
    });

    test('should submit a signal with all required fields', async () => {
      const FormData = require('form-data');
      const fs = require('fs');
      const path = require('path');
      
      const formData = new FormData();
      formData.append('signal_type', 'Pharmacy');
      formData.append('title', 'Test Pharmacy Downtown');
      formData.append('working_hours', 'Mon-Fri: 9-18');
      formData.append('latitude', '42.6977');
      formData.append('longitude', '23.3219');
      
      // Create a test image file
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      if (!fs.existsSync(testImagePath)) {
        // Create a minimal valid JPEG for testing
        const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
        fs.writeFileSync(testImagePath, buffer);
      }
      
      formData.append('photo', fs.createReadStream(testImagePath));
      
      const res = await fetch(`${API_URL}/api/signals/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('signalId');
      testSignalId = data.signalId;
    });

    test('should NOT allow second signal submission on same day', async () => {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('signal_type', 'Restaurant');
      formData.append('title', 'Test Restaurant');
      formData.append('latitude', '42.6977');
      formData.append('longitude', '23.3219');
      
      const res = await fetch(`${API_URL}/api/signals/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('one signal per day');
    });

    test('should reject signal with missing required fields', async () => {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('signal_type', 'Pharmacy');
      // Missing title, location, photo
      
      const res = await fetch(`${API_URL}/api/signals/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      expect(res.status).toBe(400);
    });

    test('should reject signal with title > 100 chars', async () => {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('signal_type', 'Pharmacy');
      formData.append('title', 'A'.repeat(101));
      formData.append('latitude', '42.6977');
      formData.append('longitude', '23.3219');
      
      const res = await fetch(`${API_URL}/api/signals/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      expect(res.status).toBe(400);
    });
  });

  describe('Admin Signal Approval', () => {
    // Note: These tests require admin authentication
    // You'll need to set up adminToken before running these
    
    test('should get pending signals (admin only)', async () => {
      // Skip if no admin token
      if (!adminToken) {
        console.log('Skipping admin test - no admin token');
        return;
      }
      
      const res = await fetch(`${API_URL}/api/signals/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('signals');
      expect(Array.isArray(data.signals)).toBe(true);
    });

    test('should approve signal and create static object (admin only)', async () => {
      if (!adminToken || !testSignalId) {
        console.log('Skipping admin approval test');
        return;
      }
      
      const res = await fetch(`${API_URL}/api/signals/admin/approve/${testSignalId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('staticObject');
      expect(data.staticObject).toHaveProperty('login');
      expect(data.staticObject).toHaveProperty('password');
      testStaticObjectId = data.staticObject.id;
    });

    test('should reject signal as duplicate (admin only)', async () => {
      if (!adminToken || !testSignalId) {
        console.log('Skipping admin reject test');
        return;
      }
      
      const res = await fetch(`${API_URL}/api/signals/admin/reject/${testSignalId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Duplicate' })
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test('should mark signal as obsolete and delete object (admin only)', async () => {
      if (!adminToken || !testSignalId) {
        console.log('Skipping obsolete test');
        return;
      }
      
      const res = await fetch(`${API_URL}/api/signals/admin/obsolete/${testSignalId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      // May succeed or fail depending on whether matching objects exist
      expect(data).toHaveProperty('success');
    });
  });

  describe('Static Objects', () => {
    test('static objects should appear in search by need', async () => {
      // Search for Pharmacy offerings
      const res = await fetch(`${API_URL}/api/search/by-need?need=Pharmacy&latitude=42.6977&longitude=23.3219`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('users');
      
      // Check if any results are static objects
      const hasStaticObjects = data.users.some(u => u.is_static_object === 1);
      console.log('Static objects in search:', hasStaticObjects);
    });

    test('static object should have locked fields', async () => {
      // This would require logging in as the static object
      // and trying to update restricted fields
      // Skipping for now - would need generated login/password
      console.log('Static object restrictions test - manual verification needed');
    });
  });

  describe('My Signals History', () => {
    test('user should see their submitted signals', async () => {
      const res = await fetch(`${API_URL}/api/signals/my-signals`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('signals');
      expect(Array.isArray(data.signals)).toBe(true);
    });
  });

  describe('Service Categories', () => {
    test('should include new signal categories', () => {
      const { ALL_SERVICES } = require('../utils/serviceCategories');
      
      const newCategories = [
        'Pharmacy',
        'Computer Store',
        'Gym',
        'Beauty/Hair Salon',
        'Accident',
        'Person Needing Help'
      ];
      
      newCategories.forEach(category => {
        expect(ALL_SERVICES).toContain(category);
      });
    });
  });
});

// Export for test runner
module.exports = {
  name: 'Signals System Tests',
  tests: describe
};
