// Version: 001.00001
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Database = require('better-sqlite3');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { authenticate } = require('./middleware/auth');
const { checkCriticalWords } = require('./middleware/monitoring');
const createAuthRoutes = require('./routes/auth');
const createFriendsRoutes = require('./routes/friends');
const createMessagesRoutes = require('./routes/messages');
const createPaymentRoutes = require('./routes/payment');
const createAdminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// SQLite Database
const db = new Database('amschat.db');
db.pragma('journal_mode = WAL');

// Initialize database
const schema = fs.readFileSync('db_setup.sql', 'utf8');
db.exec(schema);

// File upload directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Security
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

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

app.use('/api/', apiLimiter);

// WebSocket clients map
const clients = new Map();

// Cleanup expired files every hour
setInterval(() => {
  const expired = db.prepare('SELECT * FROM temp_files WHERE expires_at < datetime("now")').all();
  
  expired.forEach(file => {
    try {
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  });
  
  db.prepare('DELETE FROM temp_files WHERE expires_at < datetime("now")').run();
  console.log(`🧹 Cleaned up ${expired.length} expired files`);
}, 60 * 60 * 1000);

// WebSocket connection handler
wss.on('connection', async (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const token = params.get('token');

  if (!token) {
    ws.close(1008, 'Authentication required');
    return;
  }

  const session = db.prepare(`
    SELECT phone FROM sessions 
    WHERE token = ? AND expires_at > datetime('now')
  `).get(token);

  if (!session) {
    ws.close(1008, 'Invalid or expired token');
    return;
  }

  const phone = session.phone;
  clients.set(token, { ws, phone });
  console.log('✅ WebSocket connected:', phone);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'message') {
        if (!data.to || !data.text || data.text.length > 5000) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
          return;
        }

        // Check friendship
        const [phone1, phone2] = [phone, data.to].sort();
        const friendCheck = db.prepare('SELECT 1 FROM friends WHERE phone1 = ? AND phone2 = ?').get(phone1, phone2);

        if (!friendCheck) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not friends' }));
          return;
        }

        const sanitizedText = data.text.trim();

        // Check for critical words
        const flagged = checkCriticalWords(db, sanitizedText, phone, data.to);

        // Save message
        const stmt = db.prepare('INSERT INTO messages (from_phone, to_phone, text, flagged) VALUES (?, ?, ?, ?)');
        const result = stmt.run(phone, data.to, sanitizedText, flagged ? 1 : 0);

        // Update flagged_conversations with actual message_id
        if (flagged) {
          db.prepare(`
            UPDATE flagged_conversations 
            SET message_id = ? 
            WHERE phone1 = ? AND phone2 = ? AND message_id = 0
            ORDER BY flagged_at DESC LIMIT 1
          `).run(result.lastInsertRowid, phone1, phone2);
        }

        const messageData = {
          type: 'message',
          id: result.lastInsertRowid,
          from: phone,
          to: data.to,
          text: sanitizedText,
          timestamp: Date.now(),
          flagged
        };

        // Send to recipient
        for (const [clientToken, client] of clients.entries()) {
          if (client.phone === data.to && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(messageData));
          }
        }

        ws.send(JSON.stringify({ ...messageData, type: 'sent' }));
      } else if (data.type === 'file_notification') {
        // Notify recipient about file
        for (const [clientToken, client] of clients.entries()) {
          if (client.phone === data.to && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
              type: 'file_available',
              from: phone,
              fileId: data.fileId,
              fileName: data.fileName,
              fileSize: data.fileSize,
              fileType: data.fileType
            }));
          }
        }
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
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    db: 'sqlite',
    timestamp: Date.now() 
  });
});

// Auth routes (no authentication required)
app.use('/api/auth', authLimiter, createAuthRoutes(db));

// Payment routes (no authentication required for pricing)
app.use('/api/payment', createPaymentRoutes(db));

// Protected routes (require authentication)
app.use('/api/friends', authenticate(db), createFriendsRoutes(db));
app.use('/api/messages', authenticate(db), createMessagesRoutes(db, uploadDir));

// Admin routes (separate authentication)
app.use('/api/admin', createAdminRoutes(db));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     🚀 AMS Chat Server v4.0            ║
╠════════════════════════════════════════╣
║  Port: ${PORT.toString().padEnd(31)}  ║
║  Database: SQLite (amschat.db)         ║
║  Features:                             ║
║    ✓ Password authentication           ║
║    ✓ Custom contact names              ║
║    ✓ File sharing (100MB)              ║
║    ✓ Critical words monitoring         ║
║    ✓ Admin panel                       ║
║    ✓ Monthly subscription €5/$5        ║
╚════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down...');
  server.close(() => {
    db.close();
    console.log('✅ Server closed');
    process.exit(0);
  });
});
