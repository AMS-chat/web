-- AMS Chat Database Schema v4.2
-- Shared between Web & Mobile App

-- Users table - phone is NOT unique! phone + password_hash combination is unique
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  height_cm INTEGER,
  weight_kg INTEGER,
  country TEXT,
  city TEXT,
  village TEXT,
  street TEXT,
  workplace TEXT,
  paid_until TEXT NOT NULL,
  payment_amount REAL NOT NULL,
  payment_currency TEXT NOT NULL,
  country_code TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  is_blocked INTEGER DEFAULT 0,
  blocked_reason TEXT,
  is_reported INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  UNIQUE(phone, password_hash)
);

-- Sessions table (now links to user id, not phone)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  device_type TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Friends table (now uses user_id instead of phone)
CREATE TABLE IF NOT EXISTS friends (
  user_id1 INTEGER NOT NULL,
  user_id2 INTEGER NOT NULL,
  custom_name_by_user1 TEXT,
  custom_name_by_user2 TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id1, user_id2),
  CHECK (user_id1 < user_id2),
  FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table (uses user_id)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  text TEXT,
  file_id TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT,
  flagged INTEGER DEFAULT 0,
  edited_by_admin INTEGER DEFAULT 0,
  original_text TEXT,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Temp files table
CREATE TABLE IF NOT EXISTS temp_files (
  id TEXT PRIMARY KEY,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  downloaded INTEGER DEFAULT 0,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payment logs
CREATE TABLE IF NOT EXISTS payment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  stripe_payment_id TEXT,
  status TEXT NOT NULL,
  country_code TEXT,
  ip_address TEXT,
  payment_type TEXT DEFAULT 'new',
  months INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Critical words for monitoring (admin)
CREATE TABLE IF NOT EXISTS critical_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  added_at TEXT DEFAULT (datetime('now')),
  added_by TEXT DEFAULT 'admin'
);

-- Flagged conversations (admin monitoring)
CREATE TABLE IF NOT EXISTS flagged_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id1 INTEGER NOT NULL,
  user_id2 INTEGER NOT NULL,
  matched_word TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  conversation_context TEXT,
  flagged_at TEXT DEFAULT (datetime('now')),
  reviewed INTEGER DEFAULT 0,
  FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Reports table (when users report each other)
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_user_id INTEGER NOT NULL,
  reported_user_id INTEGER NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_paid ON users(paid_until);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(is_blocked);
CREATE INDEX IF NOT EXISTS idx_users_reported ON users(is_reported);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(full_name);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_to ON messages(from_user_id, to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(flagged) WHERE flagged = 1;
CREATE INDEX IF NOT EXISTS idx_temp_files_expires ON temp_files(expires_at);
CREATE INDEX IF NOT EXISTS idx_friends_user1 ON friends(user_id1);
CREATE INDEX IF NOT EXISTS idx_friends_user2 ON friends(user_id2);
CREATE INDEX IF NOT EXISTS idx_flagged_conv_reviewed ON flagged_conversations(reviewed);
CREATE INDEX IF NOT EXISTS idx_critical_words_word ON critical_words(word);

-- Insert default admin (password: admin123 - CHANGE THIS!)
INSERT OR IGNORE INTO admin_users (username, password_hash) 
VALUES ('admin', '$2b$10$rBV2kHaW7RvJhWxGg0KhJeqGJ0Y9mYvH7K8KZxBqWqP4qOa8Jz0Ny');

-- Insert some default critical words
INSERT OR IGNORE INTO critical_words (word) VALUES 
('drugs'), ('weapon'), ('illegal'), ('bomb'), ('terror'),
('kill'), ('murder'), ('kidnap'), ('ransom'), ('threat');
