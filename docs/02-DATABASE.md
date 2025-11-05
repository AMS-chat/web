# 02 - База данни

## 🗄️ SQLite Database Schema

AMS Chat използва **SQLite** - file-based database без нужда от отделен сървър.

---

## 📊 Таблици

### **1. users** - Потребители
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,                  -- Телефонен номер
  password_hash TEXT NOT NULL,          -- Bcrypt hash на паролата
  full_name TEXT NOT NULL,              -- Пълно име
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  height_cm INTEGER,                    -- Височина в см
  weight_kg INTEGER,                    -- Тегло в кг
  country TEXT,                         -- Държава
  city TEXT,                            -- Град
  village TEXT,                         -- Село
  street TEXT,                          -- Улица
  workplace TEXT,                       -- Работно място
  paid_until TEXT NOT NULL,             -- Платен до (ISO datetime)
  payment_amount REAL NOT NULL,         -- Платена сума
  payment_currency TEXT NOT NULL,       -- Валута (EUR/USD)
  country_code TEXT,                    -- Код на държава (BG, US, etc.)
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  is_blocked INTEGER DEFAULT 0,         -- Блокиран ли е
  blocked_reason TEXT,
  is_reported INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  
  -- Location fields (заснети от admin)
  location_country TEXT,
  location_city TEXT,
  location_village TEXT,
  location_street TEXT,
  location_number TEXT,
  location_latitude REAL,              -- GPS координати
  location_longitude REAL,
  location_ip TEXT,
  location_captured_at TEXT,           -- Кога е заснето
  
  UNIQUE(phone, password_hash)         -- Комбинация phone + password е уникална
);
```

**Забележки:**
- `phone` НЕ е уникален (няколко users могат да имат същ телефон с различни пароли)
- `password_hash` е bcrypt hash (10 rounds)
- `paid_until` определя дали user е активен

---

### **2. sessions** - Сесии
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,           -- JWT token
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  device_type TEXT,                     -- web/mobile/ios/android
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### **3. friends** - Контакти/Приятели
```sql
CREATE TABLE friends (
  user_id1 INTEGER NOT NULL,           -- По-малкото user ID
  user_id2 INTEGER NOT NULL,           -- По-голямото user ID
  custom_name_by_user1 TEXT,           -- Име дадено от user1
  custom_name_by_user2 TEXT,           -- Име дадено от user2
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id1, user_id2),
  CHECK (user_id1 < user_id2),         -- Винаги user_id1 < user_id2
  FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE
);
```

**Забележки:**
- Симетрична връзка (user1-user2 е същото като user2-user1)
- `CHECK (user_id1 < user_id2)` гарантира уникалност

---

### **4. messages** - Съобщения
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  text TEXT,                           -- Текст на съобщението
  file_id TEXT,                        -- ID на файл (ако има)
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT,                        -- Кога е прочетено
  flagged INTEGER DEFAULT 0,           -- Маркирано като критично
  edited_by_admin INTEGER DEFAULT 0,   -- Редактирано от admin
  original_text TEXT,                  -- DEPRECATED - вече не се използва
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Важно:**
- Само последните ~5KB съобщения се пазят (автоматично почистване)
- `original_text` вече НЕ се използва (admin edit е временен)

---

### **5. temp_files** - Временни файлове
```sql
CREATE TABLE temp_files (
  id TEXT PRIMARY KEY,                 -- UUID
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,             -- Path в uploads/
  uploaded_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,            -- Auto-delete след този date
  downloaded INTEGER DEFAULT 0,        -- Дали е свален
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Файлове се трият автоматично след:**
- Recipient свали файла
- 24 часа (ако не е свален)

---

### **6. payment_logs** - История на плащания
```sql
CREATE TABLE payment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,              -- EUR/USD
  stripe_payment_id TEXT,              -- Stripe Payment Intent ID
  status TEXT NOT NULL,                -- succeeded/failed/pending
  country_code TEXT,
  ip_address TEXT,
  payment_type TEXT DEFAULT 'new',     -- new/renewal/admin_manual
  months INTEGER DEFAULT 1,            -- Колко месеца са платени
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### **7. critical_words** - Критични думи (monitoring)
```sql
CREATE TABLE critical_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,           -- Думата (lowercase)
  added_at TEXT DEFAULT (datetime('now')),
  added_by TEXT DEFAULT 'admin'
);
```

**Default critical words:**
- drugs, weapon, illegal, bomb, terror, kill, murder, kidnap, ransom, threat

---

### **8. flagged_conversations** - Маркирани разговори
```sql
CREATE TABLE flagged_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id1 INTEGER NOT NULL,
  user_id2 INTEGER NOT NULL,
  matched_word TEXT NOT NULL,          -- Коя дума е match-ната
  message_id INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  conversation_context TEXT,           -- Контекст (няколко съобщения)
  flagged_at TEXT DEFAULT (datetime('now')),
  reviewed INTEGER DEFAULT 0,          -- Прегледан от admin
  FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

---

### **9. reports** - Репортове между users
```sql
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_user_id INTEGER NOT NULL,   -- Кой репортва
  reported_user_id INTEGER NOT NULL,   -- Кого репортва
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### **10. admin_users** - Администратори
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,         -- Bcrypt hash
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);
```

**Default admin:**
- Username: `admin`
- Password: `admin123` (hash: `$2b$10$rBV2kHaW7RvJhWxGg0KhJeqGJ0Y9mYvH7K8KZxBqWqP4qOa8Jz0Ny`)

---

## 📇 Indexes

```sql
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_paid ON users(paid_until);
CREATE INDEX idx_users_blocked ON users(is_blocked);
CREATE INDEX idx_users_reported ON users(is_reported);
CREATE INDEX idx_users_name ON users(full_name);
CREATE INDEX idx_users_country ON users(country);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_messages_from_to ON messages(from_user_id, to_user_id, created_at DESC);
CREATE INDEX idx_messages_flagged ON messages(flagged) WHERE flagged = 1;
CREATE INDEX idx_temp_files_expires ON temp_files(expires_at);
CREATE INDEX idx_friends_user1 ON friends(user_id1);
CREATE INDEX idx_friends_user2 ON friends(user_id2);
CREATE INDEX idx_flagged_conv_reviewed ON flagged_conversations(reviewed);
CREATE INDEX idx_critical_words_word ON critical_words(word);
```

---

## 🔄 Миграции

### **Add location fields** (if upgrading from old version):
```sql
ALTER TABLE users ADD COLUMN location_country TEXT;
ALTER TABLE users ADD COLUMN location_city TEXT;
ALTER TABLE users ADD COLUMN location_village TEXT;
ALTER TABLE users ADD COLUMN location_street TEXT;
ALTER TABLE users ADD COLUMN location_number TEXT;
ALTER TABLE users ADD COLUMN location_latitude REAL;
ALTER TABLE users ADD COLUMN location_longitude REAL;
ALTER TABLE users ADD COLUMN location_ip TEXT;
ALTER TABLE users ADD COLUMN location_captured_at TEXT;
```

---

## 🗑️ Cleanup Jobs

### **1. Delete expired files:**
```sql
-- Run daily via cron
DELETE FROM temp_files WHERE expires_at < datetime('now');
```

```bash
# Cron job
0 2 * * * sqlite3 /path/to/chat.db "DELETE FROM temp_files WHERE expires_at < datetime('now');"
```

### **2. Delete old messages (keep last 5KB per conversation):**
```javascript
// В middleware/monitoring.js
// Auto-trimming при всяко ново съобщение
```

### **3. Delete expired sessions:**
```sql
DELETE FROM sessions WHERE expires_at < datetime('now');
```

---

## 🔍 Полезни Queries

### **Active users:**
```sql
SELECT COUNT(*) FROM users WHERE paid_until > datetime('now');
```

### **Flagged conversations (unreviewed):**
```sql
SELECT fc.*, u1.phone as phone1, u2.phone as phone2
FROM flagged_conversations fc
JOIN users u1 ON fc.user_id1 = u1.id
JOIN users u2 ON fc.user_id2 = u2.id
WHERE fc.reviewed = 0
ORDER BY fc.flagged_at DESC;
```

### **User's contacts:**
```sql
SELECT 
  CASE WHEN user_id1 = ? THEN user_id2 ELSE user_id1 END as contact_id,
  CASE WHEN user_id1 = ? THEN custom_name_by_user1 ELSE custom_name_by_user2 END as custom_name
FROM friends
WHERE user_id1 = ? OR user_id2 = ?;
```

### **Conversation between two users:**
```sql
SELECT * FROM messages
WHERE (from_user_id = ? AND to_user_id = ?) 
   OR (from_user_id = ? AND to_user_id = ?)
ORDER BY created_at DESC
LIMIT 100;
```

---

## 🛠️ Backup

### **Full backup:**
```bash
sqlite3 chat.db ".backup chat-backup-$(date +%Y%m%d).db"
```

### **SQL dump:**
```bash
sqlite3 chat.db .dump > chat-backup-$(date +%Y%m%d).sql
```

### **Restore:**
```bash
# From backup file
cp chat-backup-20241105.db chat.db

# From SQL dump
sqlite3 chat.db < chat-backup-20241105.sql
```

---

## 📊 Database Size Management

SQLite file може да расте:

### **Vacuum (дефрагментация):**
```bash
sqlite3 chat.db "VACUUM;"
```

### **Auto-vacuum (в db_setup.sql):**
```sql
PRAGMA auto_vacuum = FULL;
```

---

## 🔐 Security

### **File permissions:**
```bash
chmod 600 chat.db  # Само owner може да чете/пише
chown www-data:www-data chat.db  # Ако използваш nginx/apache
```

### **Backup encryption:**
```bash
# Encrypt backup
gpg -c chat-backup.db

# Decrypt
gpg chat-backup.db.gpg
```

---

**Следващо:** [03-ENVIRONMENT.md](./03-ENVIRONMENT.md) - Environment variables
