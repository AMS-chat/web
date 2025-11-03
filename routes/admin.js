const express = require('express');
const { hashPassword, verifyPassword } = require('../utils/password');

function createAdminRoutes(db) {
  const router = express.Router();

  // Admin login
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const admin = db.prepare('SELECT username, password_hash FROM admin_users WHERE username = ?').get(username);

      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const passwordMatch = await verifyPassword(password, admin.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      db.prepare('UPDATE admin_users SET last_login = datetime("now") WHERE username = ?').run(username);

      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      res.json({
        success: true,
        token,
        username
      });
    } catch (err) {
      console.error('Admin login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Page 1: Flagged conversations with bulk block
  router.get('/flagged-users', (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      // Get unique users who have flagged conversations
      const users = db.prepare(`
        SELECT DISTINCT 
          u.phone, u.full_name, u.gender, u.is_blocked, u.paid_until,
          COUNT(DISTINCT fc.id) as flagged_count
        FROM users u
        INNER JOIN flagged_conversations fc ON (u.phone = fc.phone1 OR u.phone = fc.phone2)
        WHERE fc.reviewed = 0
        GROUP BY u.phone
        ORDER BY flagged_count DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      const total = db.prepare(`
        SELECT COUNT(DISTINCT u.phone) as count
        FROM users u
        INNER JOIN flagged_conversations fc ON (u.phone = fc.phone1 OR u.phone = fc.phone2)
        WHERE fc.reviewed = 0
      `).get().count;

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      console.error('Get flagged users error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Block user(s)
  router.post('/block-users', (req, res) => {
    try {
      const { phones, reason } = req.body;

      if (!phones || !Array.isArray(phones)) {
        return res.status(400).json({ error: 'Phones array required' });
      }

      const placeholders = phones.map(() => '?').join(',');
      db.prepare(`UPDATE users SET is_blocked = 1, blocked_reason = ? WHERE phone IN (${placeholders})`)
        .run(reason || 'Admin blocked', ...phones);

      res.json({ success: true, blocked: phones.length });
    } catch (err) {
      console.error('Block users error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Unblock user
  router.post('/unblock-user', (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Phone required' });
      }

      db.prepare(`
        UPDATE users 
        SET is_blocked = 0, blocked_reason = NULL, failed_login_attempts = 0 
        WHERE phone = ?
      `).run(phone);

      res.json({ success: true });
    } catch (err) {
      console.error('Unblock user error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Page 2: All users with search and payment management
  router.get('/all-users', (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      let query = `
        SELECT phone, full_name, gender, height_cm, city, village, street, 
               paid_until, is_blocked, created_at, last_login
        FROM users
        WHERE 1=1
      `;

      const params = [];

      if (search) {
        query += ` AND (phone LIKE ? OR full_name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const users = db.prepare(query).all(...params);

      const countQuery = `SELECT COUNT(*) as count FROM users WHERE 1=1` + 
        (search ? ` AND (phone LIKE ? OR full_name LIKE ?)` : '');
      const countParams = search ? [`%${search}%`, `%${search}%`] : [];
      const total = db.prepare(countQuery).get(...countParams).count;

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      console.error('Get all users error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Update user payment (admin only)
  router.post('/update-payment', (req, res) => {
    try {
      const { phone, months } = req.body;

      if (!phone || !months) {
        return res.status(400).json({ error: 'Phone and months required' });
      }

      const user = db.prepare('SELECT paid_until FROM users WHERE phone = ?').get(phone);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Calculate new paid_until
      let paidUntil = new Date(user.paid_until);
      if (paidUntil < new Date()) {
        paidUntil = new Date();
      }
      paidUntil.setMonth(paidUntil.getMonth() + parseInt(months));

      db.prepare('UPDATE users SET paid_until = ? WHERE phone = ?')
        .run(paidUntil.toISOString(), phone);

      // Log manual payment
      db.prepare(`
        INSERT INTO payment_logs (phone, amount, currency, status, payment_type, months)
        VALUES (?, 0, 'MANUAL', 'succeeded', 'admin_manual', ?)
      `).run(phone, months);

      res.json({ success: true, newPaidUntil: paidUntil.toISOString() });
    } catch (err) {
      console.error('Update payment error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Mark as unpaid
  router.post('/mark-unpaid', (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Phone required' });
      }

      const pastDate = new Date('2000-01-01').toISOString();
      db.prepare('UPDATE users SET paid_until = ? WHERE phone = ?').run(pastDate, phone);

      res.json({ success: true });
    } catch (err) {
      console.error('Mark unpaid error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Page 4: Users table with all messages
  router.get('/users-with-messages', (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const users = db.prepare(`
        SELECT phone, full_name, gender, height_cm, city, village, street
        FROM users
        ORDER BY full_name
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      // For each user, get all their conversations grouped by contact
      const usersWithMessages = users.map(user => {
        const conversations = db.prepare(`
          SELECT 
            CASE WHEN from_phone = ? THEN to_phone ELSE from_phone END as contact_phone,
            GROUP_CONCAT(
              CASE WHEN from_phone = ? THEN 'Me' ELSE contact_phone END || ': ' || text, 
              '\n'
            ) as messages
          FROM messages
          WHERE (from_phone = ? OR to_phone = ?) AND text IS NOT NULL
          GROUP BY contact_phone
        `).all(user.phone, user.phone, user.phone, user.phone);

        const allMessages = conversations.map(c => 
          `━━━ With ${c.contact_phone} ━━━\n${c.messages}`
        ).join('\n\n');

        return {
          ...user,
          allMessages
        };
      });

      const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

      res.json({
        users: usersWithMessages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      console.error('Get users with messages error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Page 5: Detailed user view
  router.get('/user-details/:phone', (req, res) => {
    try {
      const { phone } = req.params;

      // Get main user details
      const user = db.prepare(`
        SELECT phone, full_name, gender, height_cm, weight_kg, city, village, street, workplace,
               paid_until, is_blocked, blocked_reason, created_at, last_login
        FROM users WHERE phone = ?
      `).get(phone);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if has flagged conversations
      const flaggedCount = db.prepare(`
        SELECT COUNT(*) as count FROM flagged_conversations 
        WHERE (phone1 = ? OR phone2 = ?) AND reviewed = 0
      `).get(phone, phone).count;

      user.hasFlaggedConversations = flaggedCount > 0;
      user.flaggedCount = flaggedCount;

      // Get all contacts with their details and conversations
      const contacts = db.prepare(`
        SELECT DISTINCT
          CASE WHEN phone1 = ? THEN phone2 ELSE phone1 END as contact_phone,
          CASE WHEN phone1 = ? THEN custom_name_by_phone1 ELSE custom_name_by_phone2 END as custom_name
        FROM friends
        WHERE phone1 = ? OR phone2 = ?
      `).all(phone, phone, phone, phone);

      const contactDetails = contacts.map(contact => {
        // Get contact user details
        const contactUser = db.prepare(`
          SELECT full_name, gender, city, village, street, paid_until, is_blocked
          FROM users WHERE phone = ?
        `).get(contact.contact_phone);

        // Get conversation
        const messages = db.prepare(`
          SELECT from_phone, text, created_at
          FROM messages
          WHERE ((from_phone = ? AND to_phone = ?) OR (from_phone = ? AND to_phone = ?))
            AND text IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 100
        `).all(phone, contact.contact_phone, contact.contact_phone, phone);

        const conversation = messages.reverse().map(m => 
          `[${m.created_at}] ${m.from_phone === phone ? user.full_name : (contactUser?.full_name || contact.contact_phone)}: ${m.text}`
        ).join('\n');

        return {
          phone: contact.contact_phone,
          customName: contact.custom_name,
          fullName: contactUser?.full_name || 'Unknown',
          gender: contactUser?.gender || 'Unknown',
          city: contactUser?.city || '',
          village: contactUser?.village || '',
          street: contactUser?.street || '',
          isPaid: contactUser ? new Date(contactUser.paid_until) > new Date() : false,
          paidUntil: contactUser?.paid_until || '',
          isBlocked: contactUser?.is_blocked || false,
          conversation
        };
      });

      res.json({
        user,
        contacts: contactDetails
      });
    } catch (err) {
      console.error('Get user details error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Original endpoints (keep for compatibility)
  router.get('/flagged-conversations', (req, res) => {
    try {
      const flagged = db.prepare(`
        SELECT 
          fc.*,
          u1.full_name as phone1_name,
          u2.full_name as phone2_name
        FROM flagged_conversations fc
        LEFT JOIN users u1 ON fc.phone1 = u1.phone
        LEFT JOIN users u2 ON fc.phone2 = u2.phone
        WHERE reviewed = 0
        ORDER BY flagged_at DESC
        LIMIT 100
      `).all();

      res.json({ conversations: flagged });
    } catch (err) {
      console.error('Get flagged error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/review/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('UPDATE flagged_conversations SET reviewed = 1 WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err) {
      console.error('Review error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/critical-words', (req, res) => {
    try {
      const words = db.prepare('SELECT * FROM critical_words ORDER BY word').all();
      res.json({ words });
    } catch (err) {
      console.error('Get words error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/critical-words', (req, res) => {
    try {
      const { word } = req.body;

      if (!word || word.length > 30) {
        return res.status(400).json({ error: 'Word required (max 30 chars)' });
      }

      db.prepare('INSERT OR IGNORE INTO critical_words (word) VALUES (?)').run(word.toLowerCase());

      res.json({ success: true });
    } catch (err) {
      console.error('Add word error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.delete('/critical-words/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM critical_words WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err) {
      console.error('Delete word error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/stats', (req, res) => {
    try {
      const stats = {
        totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
        activeUsers: db.prepare('SELECT COUNT(*) as count FROM users WHERE paid_until > datetime("now")').get().count,
        blockedUsers: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_blocked = 1').get().count,
        totalMessages: db.prepare('SELECT COUNT(*) as count FROM messages').get().count,
        flaggedConversations: db.prepare('SELECT COUNT(*) as count FROM flagged_conversations WHERE reviewed = 0').get().count,
        criticalWords: db.prepare('SELECT COUNT(*) as count FROM critical_words').get().count,
        totalRevenue: db.prepare('SELECT SUM(amount) as total FROM payment_logs WHERE status = "succeeded"').get().total || 0
      };

      res.json(stats);
    } catch (err) {
      console.error('Get stats error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}

module.exports = createAdminRoutes;
