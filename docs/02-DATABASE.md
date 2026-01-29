# 📊 AMS Chat - Database Documentation v00018

## 🗄️ Database Overview

**Type:** SQLite 3  
**Location:** `amschat.db` (root of project)  
**Schema Version:** 00018 (with crypto payments)

---

## 🚀 SECTION 1: Fresh Database Installation

### When to use:
- New server setup
- Starting from scratch
- Development environment

### Steps:

#### 1. Navigate to project:
```bash
cd /var/www/ams-chat-web
```

#### 2. Run setup script:
```bash
sqlite3 amschat.db < database/db_setup.sql
```

#### 3. Verify:
```bash
sqlite3 amschat.db ".tables"
```

**Expected output:**
```
emergencies      messages         services         
friends          payment_overrides sessions         
help_responses   reported_users   users
```

#### 4. Seed sample data (optional):
```bash
sqlite3 amschat.db < database/emergency_contacts_seed.sql
```

**Done!** Database is ready.

---

## 🔄 SECTION 2: Update Existing Database (Empty/Testing)

### When to use:
- Development/testing environment
- Database with no important data
- Can drop and recreate

### Steps:

#### 1. Backup (just in case):
```bash
cp amschat.db amschat.db.backup.$(date +%Y%m%d_%H%M%S)
```

#### 2. Drop old database:
```bash
rm amschat.db
```

#### 3. Create fresh:
```bash
sqlite3 amschat.db < database/db_setup.sql
```

**Done!** Fresh database with new schema.

---

## 🛡️ SECTION 3: Migrate Production Database (With Live Data)

### ⚠️ CRITICAL: Use this when database contains real user data!

### When to use:
- Production server
- Database with chat messages
- Database with user accounts
- **Any database you can't lose!**

---

### Migration Process:

#### Step 1: Backup First! (MANDATORY)
```bash
cd /var/www/ams-chat-web

# Create backup with timestamp
cp amschat.db backups/amschat.db.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup exists
ls -lh backups/
```

**NEVER skip this step!**

---

#### Step 2: Check current schema:
```bash
sqlite3 amschat.db "PRAGMA table_info(users);" | grep crypto_wallet
```

**If empty:** Need to migrate  
**If shows crypto_wallet fields:** Already migrated

---

#### Step 3: Run migration script:
```bash
sqlite3 amschat.db < database/db_migration_crypto_payments.sql
```

**What this does:**
- ✅ Adds crypto wallet fields (5 currencies)
- ✅ Adds subscription fields
- ✅ Adds emergency fields
- ✅ Creates payment_overrides table
- ✅ Adds manual activation fields
- ✅ Adds session expiry field
- ❌ Does NOT delete any existing data
- ❌ Does NOT modify chat messages

---

#### Step 4: Verify migration:
```bash
# Check new fields exist
sqlite3 amschat.db "PRAGMA table_info(users);" | grep -E "crypto_wallet|subscription|emergency"

# Should show:
# crypto_wallet_btc
# crypto_wallet_eth
# crypto_wallet_bnb
# crypto_wallet_kcy_meme
# crypto_wallet_kcy_ams
# subscription_active
# paid_until
# emergency_active
# ...
```

---

#### Step 5: Check data integrity:
```bash
# Count users (should be same as before)
sqlite3 amschat.db "SELECT COUNT(*) FROM users;"

# Count messages (should be same as before)
sqlite3 amschat.db "SELECT COUNT(*) FROM messages;"

# Check new fields have defaults
sqlite3 amschat.db "SELECT crypto_wallet_btc, subscription_active FROM users LIMIT 5;"
```

---

#### Step 6: Restart server:
```bash
pm2 restart ams-chat
pm2 logs ams-chat
```

**Check logs for errors!**

---

### If Migration Fails:

#### Rollback immediately:
```bash
# Stop server
pm2 stop ams-chat

# Restore backup
cp backups/amschat.db.backup.YYYYMMDD_HHMMSS amschat.db

# Restart
pm2 start ams-chat
```

**Then investigate error before retrying!**

---

## 📋 Database Schema (Current v00018)

### **1. users** table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
  birth_date TEXT,
  age INTEGER,
  height_cm INTEGER,
  weight_kg INTEGER,
  country TEXT,
  city TEXT,
  village TEXT,
  street TEXT,
  workplace TEXT,
  
  -- Payment (Stripe)
  paid_until TEXT NOT NULL,
  payment_amount REAL NOT NULL,
  payment_currency TEXT NOT NULL,
  
  -- Crypto Payment (NEW in v00018)
  crypto_wallet_btc TEXT,
  crypto_wallet_eth TEXT,
  crypto_wallet_bnb TEXT,
  crypto_wallet_kcy_meme TEXT,
  crypto_wallet_kcy_ams TEXT,
  
  -- Subscription (NEW in v00018)
  subscription_active INTEGER DEFAULT 0,
  last_payment_check TEXT,
  
  -- Emergency Button (NEW in v00018)
  emergency_active INTEGER DEFAULT 0,
  emergency_active_until TEXT,
  
  -- Manual Activation (NEW in v00018)
  manually_activated INTEGER DEFAULT 0,
  activation_reason TEXT,
  activated_by_admin_id INTEGER,
  
  -- Session (NEW in v00018)
  session_expires_at TEXT,
  
  -- Profile fields
  code_word TEXT,
  current_need TEXT,
  offerings TEXT,
  is_verified INTEGER DEFAULT 0,
  email TEXT,
  hide_phone INTEGER DEFAULT 0,
  hide_names INTEGER DEFAULT 0,
  
  -- Location capture
  location_country TEXT,
  location_city TEXT,
  location_latitude REAL,
  location_longitude REAL,
  location_ip TEXT,
  location_captured_at TEXT,
  
  -- Tracking
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  is_blocked INTEGER DEFAULT 0,
  
  UNIQUE(phone, password_hash)
);
```

### **2. payment_overrides** table (NEW in v00018)
```sql
CREATE TABLE payment_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  admin_id INTEGER,
  reason TEXT,
  duration_days INTEGER NOT NULL,
  activated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### **3. Other tables:**
- `sessions` - User sessions
- `friends` - Friend connections
- `messages` - Chat messages
- `emergencies` - Emergency contacts
- `services` - Service categories
- `help_responses` - Help button logs
- `reported_users` - User reports

**Full schema:** See `database/db_setup.sql`

---

## 🔍 Database Maintenance

### Check database size:
```bash
ls -lh amschat.db
```

### Vacuum database (optimize):
```bash
sqlite3 amschat.db "VACUUM;"
```

### Backup database:
```bash
# Manual backup
cp amschat.db backups/amschat.db.$(date +%Y%m%d_%H%M%S)

# Or use SQLite backup command
sqlite3 amschat.db ".backup backups/amschat.db.$(date +%Y%m%d_%H%M%S)"
```

### View table structure:
```bash
sqlite3 amschat.db ".schema users"
```

### Count records:
```bash
sqlite3 amschat.db "SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM sessions) as sessions;"
```

---

## 🛠️ Migration Script Details

### What `db_migration_crypto_payments.sql` does:

**File location:** `database/db_migration_crypto_payments.sql`

**Changes:**
1. Adds 5 crypto wallet fields to users table
2. Adds subscription tracking fields
3. Adds emergency button fields
4. Creates payment_overrides table
5. Adds manual activation tracking
6. Adds session expiry field

**Safe to run:**
- ✅ On production database with data
- ✅ Multiple times (uses IF NOT EXISTS where possible)
- ✅ While server is running (but restart recommended)

**Data loss:**
- ❌ NO data is deleted
- ❌ NO existing fields are modified
- ❌ NO messages are touched

---

## 🚨 Emergency Procedures

### Restore from backup:
```bash
pm2 stop ams-chat
cp backups/amschat.db.backup.YYYYMMDD_HHMMSS amschat.db
pm2 start ams-chat
```

### Export data to SQL:
```bash
sqlite3 amschat.db .dump > amschat_dump.sql
```

### Import from SQL dump:
```bash
sqlite3 amschat_new.db < amschat_dump.sql
```

### Copy database to another server:
```bash
scp amschat.db user@other-server:/var/www/ams-chat-web/
```

---

## 📊 Database File Locations

```
/var/www/ams-chat-web/
├── amschat.db                              ← Main database
├── /database
│   ├── db_setup.sql                        ← Fresh install schema
│   ├── db_migration_crypto_payments.sql    ← Migration script
│   └── emergency_contacts_seed.sql         ← Sample data
└── /backups                                ← Create this folder!
    ├── amschat.db.backup.20260129_120000
    └── amschat.db.backup.20260129_150000
```

**Create backups folder:**
```bash
mkdir -p /var/www/ams-chat-web/backups
```

---

## ⚠️ Important Notes

### Before Production Deployment:
1. ✅ Test migration on copy of production database first
2. ✅ Create backup before migration
3. ✅ Verify backup is valid (can be opened)
4. ✅ Plan downtime window (5-10 minutes)
5. ✅ Have rollback plan ready

### Migration Best Practices:
- Run during low traffic period
- Monitor server logs after migration
- Test all features after migration
- Keep backup for at least 7 days

### Backup Strategy:
- Daily automatic backups recommended
- Keep last 7 days of backups
- Test restore procedure monthly

---

## 🔗 Related Documentation

- **Installation:** `docs/01-INSTALLATION.md`
- **Deployment:** `docs/09-DEPLOYMENT.md`
- **Crypto Payments:** `docs/README_CRYPTO.md`
- **Troubleshooting:** `docs/10-TROUBLESHOOTING.md`

---

**Version:** 00018  
**Last Updated:** 2026-01-29  
**Schema Version:** v4.3 + Crypto Payments
