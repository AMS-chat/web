const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["https://js.stripe.com"],
      connectSrc: ["'self'", "wss:", "ws:", "https://api.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});

app.use('/api/', apiLimiter);

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// WebSocket clients Map: token -> {ws, phone}
const clients = new Map();

// Utility Functions
function validatePhone(phone) {
  // International phone number format
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  return phoneRegex.test(phone);
}

function sanitizePhone(phone) {
  return phone.replace(/[^\d+]/g, '');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createSession(phone) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await pool.query(
    'INSERT INTO sessions (phone, token, expires_at) VALUES ($1, $2, $3)',
    [phone, token, expiresAt]
  );

  return token;
}

async function validateSession(token) {
  if (!token) return null;

  const result = await pool.query(
    'SELECT phone FROM sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );

  if (result.rows.length === 0) return null;

  // Update last activity
  await pool.query(
    'UPDATE sessions SET last_activity = NOW() WHERE token = $1',
    [token]
  );

  return result.rows[0].phone;
}

// Authentication Middleware
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const phone = await validateSession(token);
  
  if (!phone) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.phone = phone;
  next();
}

// WebSocket Authentication
wss.on('connection', async (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const token = params.get('token');

  if (!token) {
    ws.close(1008, 'Authentication required');
    return;
  }

  const phone = await validateSession(token);

  if (!phone) {
    ws.close(1008, 'Invalid or expired token');
    return;
  }

  clients.set(token, { ws, phone });
  console.log('✅ WebSocket connected:', phone);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'message') {
        // Validate input
        if (!data.to || !data.text || data.text.length > 5000) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
          return;
        }

        const sanitizedText = data.text.trim();
        if (!sanitizedText) return;

        // Check if recipient exists and is friends
        const friendCheck = await pool.query(
          `SELECT 1 FROM friends 
           WHERE (phone1 = $1 AND phone2 = $2) OR (phone1 = $2 AND phone2 = $1)`,
          [[phone, data.to].sort()]
        );

        if (friendCheck.rows.length === 0) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not friends with recipient' }));
          return;
        }

        // Save message to database
        const result = await pool.query(
          'INSERT INTO messages (from_phone, to_phone, text, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, created_at',
          [phone, data.to, sanitizedText]
        );

        const messageData = {
          type: 'message',
          id: result.rows[0].id,
          from: phone,
          to: data.to,
          text: sanitizedText,
          timestamp: result.rows[0].created_at.getTime()
        };

        // Send to recipient if online
        for (const [clientToken, client] of clients.entries()) {
          if (client.phone === data.to && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(messageData));
          }
        }

        // Confirm to sender
        ws.send(JSON.stringify({ ...messageData, type: 'sent' }));
      }
    } catch (err) {
      console.error('❌ WS message error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Server error' }));
    }
  });

  ws.on('close', () => {
    clients.delete(token);
    console.log('❌ WebSocket disconnected:', phone);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get Stripe publishable key
app.get('/api/stripe-key', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Login / Register
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const sanitized = sanitizePhone(phone);

    if (!validatePhone(sanitized)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if user exists and has active subscription
    const userResult = await pool.query(
      'SELECT phone, paid_until FROM users WHERE phone = $1',
      [sanitized]
    );

    let isPaid = false;
    let token = null;

    if (userResult.rows.length > 0) {
      const paidUntil = new Date(userResult.rows[0].paid_until);
      isPaid = paidUntil > new Date();

      if (isPaid) {
        // Create session
        token = await createSession(sanitized);
        
        // Update last login
        await pool.query(
          'UPDATE users SET last_login = NOW() WHERE phone = $1',
          [sanitized]
        );
      }
    }

    res.json({ 
      phone: sanitized,
      isPaid,
      token: isPaid ? token : null
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create payment intent
app.post('/api/payment/create-intent', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !validatePhone(phone)) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00
      currency: 'usd',
      metadata: { phone },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('❌ Payment intent error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Confirm payment and activate subscription
app.post('/api/payment/confirm', async (req, res) => {
  try {
    const { phone, paymentIntentId } = req.body;

    if (!phone || !paymentIntentId) {
      return res.status(400).json({ error: 'Phone and payment intent ID required' });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    if (paymentIntent.metadata.phone !== phone) {
      return res.status(400).json({ error: 'Phone number mismatch' });
    }

    // Set paid until date (1 month from now)
    const paidUntil = new Date();
    paidUntil.setMonth(paidUntil.getMonth() + 1);

    // Create or update user
    await pool.query(
      `INSERT INTO users (phone, paid_until, created_at, last_login) 
       VALUES ($1, $2, NOW(), NOW()) 
       ON CONFLICT (phone) 
       DO UPDATE SET paid_until = $2, last_login = NOW()`,
      [phone, paidUntil]
    );

    // Log payment
    await pool.query(
      `INSERT INTO payment_logs (phone, amount, currency, stripe_payment_id, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [phone, paymentIntent.amount, paymentIntent.currency, paymentIntentId, 'succeeded']
    );

    // Create session
    const token = await createSession(phone);

    res.json({ 
      success: true,
      token,
      paidUntil: paidUntil.toISOString()
    });
  } catch (err) {
    console.error('❌ Payment confirmation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get friends list (protected)
app.get('/api/friends', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        CASE WHEN phone1 = $1 THEN phone2 ELSE phone1 END as phone,
        (SELECT text FROM messages 
         WHERE (from_phone = $1 AND to_phone = CASE WHEN phone1 = $1 THEN phone2 ELSE phone1 END)
            OR (from_phone = CASE WHEN phone1 = $1 THEN phone2 ELSE phone1 END AND to_phone = $1)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages 
         WHERE (from_phone = $1 AND to_phone = CASE WHEN phone1 = $1 THEN phone2 ELSE phone1 END)
            OR (from_phone = CASE WHEN phone1 = $1 THEN phone2 ELSE phone1 END AND to_phone = $1)
         ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages
         WHERE to_phone = $1 
           AND from_phone = CASE WHEN phone1 = $1 THEN phone2 ELSE phone1 END
           AND read_at IS NULL) as unread_count
       FROM friends 
       WHERE phone1 = $1 OR phone2 = $1
       ORDER BY last_message_time DESC NULLS LAST`,
      [req.phone]
    );

    const friends = result.rows.map(row => ({
      phone: row.phone,
      lastMessage: row.last_message || '',
      timestamp: row.last_message_time ? new Date(row.last_message_time).getTime() : Date.now(),
      unread: parseInt(row.unread_count) || 0
    }));

    res.json({ friends });
  } catch (err) {
    console.error('❌ Get friends error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add friend (protected)
app.post('/api/friends', authenticate, async (req, res) => {
  try {
    const { friendPhone } = req.body;

    if (!friendPhone || !validatePhone(friendPhone)) {
      return res.status(400).json({ error: 'Valid friend phone number required' });
    }

    if (friendPhone === req.phone) {
      return res.status(400).json({ error: 'Cannot add yourself as friend' });
    }

    // Check if friend exists and has active subscription
    const friendCheck = await pool.query(
      'SELECT phone, paid_until FROM users WHERE phone = $1',
      [friendPhone]
    );

    if (friendCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friendPaidUntil = new Date(friendCheck.rows[0].paid_until);
    if (friendPaidUntil <= new Date()) {
      return res.status(400).json({ error: 'User subscription expired' });
    }

    const [phone1, phone2] = [req.phone, friendPhone].sort();
    
    await pool.query(
      'INSERT INTO friends (phone1, phone2) VALUES ($1, $2) ON CONFLICT (phone1, phone2) DO NOTHING',
      [phone1, phone2]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Add friend error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get messages with friend (protected)
app.get('/api/messages/:friendPhone', authenticate, async (req, res) => {
  try {
    const { friendPhone } = req.params;

    if (!validatePhone(friendPhone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Check friendship
    const friendCheck = await pool.query(
      `SELECT 1 FROM friends 
       WHERE (phone1 = $1 AND phone2 = $2) OR (phone1 = $2 AND phone2 = $1)`,
      [[req.phone, friendPhone].sort()]
    );

    if (friendCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    const result = await pool.query(
      `SELECT id, from_phone, to_phone, text, created_at, read_at
       FROM messages
       WHERE (from_phone = $1 AND to_phone = $2) OR (from_phone = $2 AND to_phone = $1)
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.phone, friendPhone]
    );

    // Mark messages as read
    await pool.query(
      `UPDATE messages SET read_at = NOW() 
       WHERE to_phone = $1 AND from_phone = $2 AND read_at IS NULL`,
      [req.phone, friendPhone]
    );

    const messages = result.rows.reverse().map(row => ({
      id: row.id,
      text: row.text,
      sent: row.from_phone === req.phone,
      timestamp: new Date(row.created_at).getTime(),
      read: row.read_at !== null
    }));

    res.json({ messages });
  } catch (err) {
    console.error('❌ Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout (protected)
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    
    // Close WebSocket if open
    if (clients.has(token)) {
      const client = clients.get(token);
      client.ws.close();
      clients.delete(token);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Logout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     🚀 KCY Chat Server Started         ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(31)}  ║
║  Env:  ${(process.env.NODE_ENV || 'development').padEnd(31)}  ║
║  URL:  http://localhost:${PORT.toString().padEnd(18)}  ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    pool.end();
    console.log('✅ Server closed');
    process.exit(0);
  });
});
