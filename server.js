const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Pool } = require('pg');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// WebSocket clients
const clients = new Map();

// WebSocket connection
wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const phone = params.get('phone');
  
  if (phone) {
    clients.set(phone, ws);
    console.log('Connected:', phone);
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'message') {
        await pool.query(
          'INSERT INTO messages (from_phone, to_phone, text, created_at) VALUES ($1, $2, $3, NOW())',
          [data.from, data.to, data.text]
        );

        const recipientWs = clients.get(data.to);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify({
            type: 'message',
            from: data.from,
            text: data.text,
            timestamp: Date.now()
          }));
        }
      }
    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', () => {
    if (phone) {
      clients.delete(phone);
      console.log('Disconnected:', phone);
    }
  });
});

// API Routes

app.post('/api/check-payment', async (req, res) => {
  const { phone } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT paid_until FROM users WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.json({ isPaid: false });
    }

    const paidUntil = new Date(result.rows[0].paid_until);
    const now = new Date();
    const isPaid = paidUntil > now;

    res.json({ isPaid });
  } catch (err) {
    console.error('Check payment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/payment', async (req, res) => {
  const { phone, token } = req.body;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100,
      currency: 'usd',
      payment_method: token,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });

    if (paymentIntent.status === 'succeeded') {
      const paidUntil = new Date();
      paidUntil.setMonth(paidUntil.getMonth() + 1);

      await pool.query(
        'INSERT INTO users (phone, paid_until, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (phone) DO UPDATE SET paid_until = $2',
        [phone, paidUntil]
      );

      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Payment failed' });
    }
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/friends/:phone', async (req, res) => {
  const { phone } = req.params;
  
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
         ORDER BY created_at DESC LIMIT 1) as timestamp
       FROM friends 
       WHERE phone1 = $1 OR phone2 = $1`,
      [phone]
    );

    const friends = result.rows.map(row => ({
      phone: row.phone,
      lastMessage: row.last_message || '',
      timestamp: row.timestamp ? new Date(row.timestamp).getTime() : Date.now(),
      unread: 0
    }));

    res.json({ friends });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/friends', async (req, res) => {
  const { phone, friendPhone } = req.body;
  
  try {
    const [phone1, phone2] = [phone, friendPhone].sort();
    
    await pool.query(
      'INSERT INTO friends (phone1, phone2) VALUES ($1, $2) ON CONFLICT (phone1, phone2) DO NOTHING',
      [phone1, phone2]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Add friend error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/messages/:phone/:friendPhone', async (req, res) => {
  const { phone, friendPhone } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT id, from_phone, to_phone, text, created_at
       FROM messages
       WHERE (from_phone = $1 AND to_phone = $2) OR (from_phone = $2 AND to_phone = $1)
       ORDER BY created_at DESC
       LIMIT 100`,
      [phone, friendPhone]
    );

    const messages = result.rows.reverse().map(row => ({
      id: row.id,
      text: row.text,
      sent: row.from_phone === phone,
      timestamp: new Date(row.created_at).getTime()
    }));

    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('🚀 KCY Chat server running on port', PORT);
});