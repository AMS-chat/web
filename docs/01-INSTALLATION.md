<!-- Version: 001.00001 -->
# 01 - Инсталация

## 📦 Системни изисквания

- **Node.js:** >= 16.x
- **npm:** >= 8.x (или yarn >= 1.22)
- **SQLite3:** >= 3.x
- **Git:** Последна версия
- **OS:** Linux, macOS, или Windows (с WSL2)

---

## 🔧 Стъпка 1: Клониране на проекта

```bash
# Ако имаш git repo
git clone <your-repo-url>
cd AMS-chat-web

# Или разархивирай ZIP файла
unzip AMS-chat-web.zip
cd AMS-chat-web
```

---

## 📥 Стъпка 2: Инсталация на зависимости

```bash
npm install
```

**Основни пакети:**
- `express` - Web framework
- `sqlite3` - Database
- `bcrypt` - Password hashing
- `jsonwebtoken` - Authentication
- `multer` - File uploads
- `stripe` - Payments
- `ws` - WebSocket за real-time chat
- `uuid` - Unique IDs

---

## 🗄️ Стъпка 3: Инициализиране на базата

```bash
# Създай базата данни
sqlite3 chat.db < db_setup.sql

# Провери дали е създадена
sqlite3 chat.db "SELECT name FROM sqlite_master WHERE type='table';"
```

**Очакван резултат:**
```
users
sessions
friends
messages
temp_files
payment_logs
critical_words
flagged_conversations
reports
admin_users
```

**Default admin credentials:**
- Username: `admin`
- Password: `admin123` ⚠️ **СМЕНИ ВЕДНАГА!**

---

## ⚙️ Стъпка 4: Конфигурация (.env файл)

```bash
cp .env.example .env
nano .env  # или vim, code, etc.
```

**Минимална конфигурация:**
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./chat.db

# JWT Secret (генерирай с: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here

# Stripe (взимаш от dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Admin IPs (разделени със запетая)
ADMIN_ALLOWED_IPS=127.0.0.1,::1

# File uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600  # 100MB in bytes

# Location APIs (всички са БЕЗПЛАТНИ!)
NOMINATIM_URL=https://nominatim.openstreetmap.org
IPAPI_URL=https://ipapi.co/json
```

**Виж [03-ENVIRONMENT.md](./03-ENVIRONMENT.md) за пълен списък.**

---

## 🚀 Стъпка 5: Стартиране

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

**Сървърът ще стартира на:** http://localhost:3000

---

## ✅ Стъпка 6: Проверка

### 1. Test homepage:
```bash
curl http://localhost:3000
```

Трябва да видиш HTML страницата.

### 2. Test API:
```bash
# Health check
curl http://localhost:3000/api/health
```

### 3. Test admin login:
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Трябва да получиш token.

---

## 📱 Mobile App (AMS-chat-app)

### Допълнителни стъпки за React Native:

```bash
cd AMS-chat-app
npm install

# Инсталирай Expo CLI ако нямаш
npm install -g expo-cli

# Инсталирай location dependencies
npx expo install expo-location
npm install axios

# Стартирай
npx expo start
```

**Scan QR code** с Expo Go app (iOS/Android)

---

## 🔒 Стъпка 7: Security setup

### 1. Смени admin паролата:
```bash
sqlite3 chat.db
```

```sql
-- Генерирай нов hash с bcrypt (10 rounds)
-- Пример за парола "MyNewPassword123"
UPDATE admin_users 
SET password_hash = '$2b$10$NEW_HASH_HERE'
WHERE username = 'admin';
```

**Или използвай Node.js script:**
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('MyNewPassword123', 10, (err, hash) => console.log(hash));"
```

### 2. Промени JWT_SECRET:
```bash
openssl rand -base64 32
```
Копирай в `.env`

### 3. Ограничи admin IPs:
```env
ADMIN_ALLOWED_IPS=Your.Server.IP,Another.IP
```

---

## 🌐 HTTPS Setup (за Location API)

Geolocation API изисква HTTPS на production!

### Option 1: Nginx Reverse Proxy
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Cloudflare (FREE)
1. Добави домейна в Cloudflare
2. SSL/TLS mode: **Full**
3. Auto HTTPS redirects: **ON**

---

## 📂 Директории структура след инсталация

```
AMS-chat-web/
├── docs/              # Документация
├── middleware/        # Auth, monitoring
├── public/           # Frontend files
├── routes/           # API endpoints
├── uploads/          # User uploaded files (създава се автоматично)
├── utils/            # Helper functions
├── chat.db           # SQLite database
├── .env              # Environment variables (НЕ commit-вай!)
├── .env.example      # Example config
├── package.json
└── server.js         # Entry point
```

---

## 🐛 Common Issues

### **"Cannot find module 'express'"**
```bash
npm install
```

### **"EADDRINUSE: address already in use"**
```bash
# Промени PORT в .env
PORT=3001
```

### **"Database locked"**
```bash
# Затвори други SQLite connections
pkill sqlite3
```

### **"Permission denied" на uploads/**
```bash
mkdir -p uploads
chmod 755 uploads
```

---

## ✅ Checklist

- [ ] Node.js инсталиран
- [ ] Dependencies инсталирани (`npm install`)
- [ ] База данни създадена (`sqlite3 chat.db < db_setup.sql`)
- [ ] `.env` файл конфигуриран
- [ ] Admin парола сменена
- [ ] Server стартира успешно
- [ ] Stripe тест mode активиран
- [ ] HTTPS конфигуриран (за production)

---

**Следващо:** [02-DATABASE.md](./02-DATABASE.md) - Database schema и миграции
