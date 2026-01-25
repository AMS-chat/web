// Version: 001.00002
const express = require('express');

// Haversine formula for calculating distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

function createSearchRoutes(db) {
  const router = express.Router();

  // Search #2: By distance
  router.post('/by-distance', (req, res) => {
    try {
      const userId = req.user.id;
      const { 
        latitude, 
        longitude, 
        min_distance = 0, 
        max_distance = 40000,
        min_age,
        max_age,
        gender,
        min_height,
        max_height
      } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Your location coordinates required' });
      }
      
      // Build query
      let query = `
        SELECT 
          id, full_name, phone, gender, birth_date, height_cm, weight_kg,
          city, country, current_need, offerings,
          location_latitude, location_longitude,
          hide_phone, hide_names
        FROM users
        WHERE 
          id != ? 
          AND is_blocked = 0
          AND paid_until > datetime('now')
          AND location_latitude IS NOT NULL
          AND location_longitude IS NOT NULL
      `;
      
      const params = [userId];
      
      // Add filters
      if (gender) {
        query += ' AND gender = ?';
        params.push(gender);
      }
      
      if (min_height) {
        query += ' AND height_cm >= ?';
        params.push(min_height);
      }
      
      if (max_height) {
        query += ' AND height_cm <= ?';
        params.push(max_height);
      }
      
      // Get all matching users
      const users = db.prepare(query).all(...params);
      
      // Calculate distance and filter
      const results = users
        .map(user => {
          const distance = calculateDistance(
            latitude, 
            longitude,
            user.location_latitude,
            user.location_longitude
          );
          
          // Calculate age
          let age = null;
          if (user.birth_date) {
            const birthDate = new Date(user.birth_date);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }
          
          // Apply distance filter
          if (distance < min_distance || distance > max_distance) {
            return null;
          }
          
          // Apply age filter
          if (age !== null) {
            if (min_age && age < min_age) return null;
            if (max_age && age > max_age) return null;
          }
          
          // Hide sensitive data
          if (user.hide_phone) {
            user.phone = user.phone.substring(0, 7) + '...';
          }
          
          if (user.hide_names) {
            const names = user.full_name.split(' ');
            user.full_name = names.map(n => n.substring(0, 4) + '...').join(' ');
          }
          
          // Remove coordinates from response
          delete user.location_latitude;
          delete user.location_longitude;
          delete user.hide_phone;
          delete user.hide_names;
          delete user.birth_date;
          
          return {
            ...user,
            age: age,
            distance_km: Math.round(distance * 10) / 10 // Round to 1 decimal
          };
        })
        .filter(Boolean) // Remove nulls
        .sort((a, b) => a.distance_km - b.distance_km); // Closest first
      
      res.json({
        total: results.length,
        results: results
      });
      
    } catch (err) {
      console.error('Search by distance error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Search #3: By need (max 50km radius)
  router.post('/by-need', (req, res) => {
    try {
      const userId = req.user.id;
      const { 
        latitude, 
        longitude,
        need, // What I'm looking for
        min_age,
        max_age,
        gender,
        min_height,
        max_height,
        city
      } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Your location coordinates required' });
      }
      
      if (!need) {
        return res.status(400).json({ error: 'Need parameter required (what are you looking for?)' });
      }
      
      const MAX_RADIUS_KM = 50;
      
      // Build query - find users who OFFER what I NEED
      let query = `
        SELECT 
          id, full_name, phone, email, gender, birth_date, height_cm, weight_kg,
          city, country, current_need, offerings, is_verified,
          location_latitude, location_longitude,
          hide_phone, hide_names
        FROM users
        WHERE 
          id != ? 
          AND is_blocked = 0
          AND paid_until > datetime('now')
          AND location_latitude IS NOT NULL
          AND location_longitude IS NOT NULL
          AND (offerings LIKE ? OR offerings LIKE ? OR offerings LIKE ?)
      `;
      
      // Search for the need in offerings (comma-separated)
      const params = [
        userId,
        need, // Exact match
        need + ',%', // At start
        '%,' + need + '%' // In middle or end
      ];
      
      // Add filters
      if (gender) {
        query += ' AND gender = ?';
        params.push(gender);
      }
      
      if (min_height) {
        query += ' AND height_cm >= ?';
        params.push(min_height);
      }
      
      if (max_height) {
        query += ' AND height_cm <= ?';
        params.push(max_height);
      }
      
      if (city) {
        query += ' AND city = ?';
        params.push(city);
      }
      
      // Get all matching users
      const users = db.prepare(query).all(...params);
      
      // Calculate distance and filter by 50km max
      const results = users
        .map(user => {
          const distance = calculateDistance(
            latitude, 
            longitude,
            user.location_latitude,
            user.location_longitude
          );
          
          // Filter by max 50km
          if (distance > MAX_RADIUS_KM) {
            return null;
          }
          
          // Calculate age
          let age = null;
          if (user.birth_date) {
            const birthDate = new Date(user.birth_date);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }
          
          // Apply age filter
          if (age !== null) {
            if (min_age && age < min_age) return null;
            if (max_age && age > max_age) return null;
          }
          
          // Hide sensitive data
          if (user.hide_phone) {
            user.phone = user.phone.substring(0, 7) + '...';
          }
          
          if (user.hide_names) {
            const names = user.full_name.split(' ');
            user.full_name = names.map(n => n.substring(0, 4) + '...').join(' ');
          }
          
          // Remove coordinates from response
          delete user.location_latitude;
          delete user.location_longitude;
          delete user.hide_phone;
          delete user.hide_names;
          delete user.birth_date;
          delete user.is_verified;
          
          return {
            ...user,
            age: age,
            distance_km: Math.round(distance * 10) / 10 // Round to 1 decimal
          };
        })
        .filter(Boolean) // Remove nulls
        .sort((a, b) => a.distance_km - b.distance_km); // Closest first
      
      res.json({
        total: results.length,
        max_radius_km: MAX_RADIUS_KM,
        searching_for: need,
        results: results
      });
      
    } catch (err) {
      console.error('Search by need error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}

module.exports = createSearchRoutes;
