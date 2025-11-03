# 🚀 AMS Chat - Пълно ръководство за настройка

## 📋 Съдържание

1. [Настройка на Web проекта](#web-setup)
2. [Настройка на Mobile проекта](#mobile-setup)
3. [База данни](#database)
4. [Stripe банкова сметка](#stripe)
5. [Admin IP защита](#admin-security)
6. [GitHub защита](#github-security)
7. [Deployment](#deployment)

---

## 🌐 1. WEB ПРОЕКТ НАСТРОЙКА {#web-setup}

### Стъпка 1: Разархивирай
```bash
unzip AMS-chat-web.zip
cd AMS-chat-web
```

### Стъпка 2: Инсталирай dependencies
```bash
npm install
```

### Стъпка 3: Конфигурация (.env файл)
```bash
cp .env.example .env
nano .env
```

**Попълни:**
```env
# Stripe Keys (от dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_твоят_ключ
STRIPE_PUBLISHABLE_KEY=pk_live_твоят_ключ

# Server
PORT=3000
NODE_ENV=production

# CORS (домейна на frontend)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Admin IP защита (твоите IP адреси, разделени със запетая)
ADMIN_ALLOWED_IPS=123.45.67.89,98.76.54.32
```

### Стъпка 4: Стартирай сървъра
```bash
# Production mode:
npm start

# Development mode:
npm run dev
```

Server стартира на: `http://localhost:3000`

---

## 📱 2. MOBILE ПРОЕКТ НАСТРОЙКА {#mobile-setup}

### Стъпка 1: Разархивирай
```bash
unzip AMS-chat-app.zip
cd AMS-chat-app
```

### Стъпка 2: Инсталирай dependencies
```bash
npm install
```

### Стъпка 3: Конфигурирай API URL
Редактирай `src/config/index.js`:
```javascript
export const API_URL = 'https://yourdomain.com'; // твоя backend URL
export const WS_URL = 'wss://yourdomain.com';
```

### Стъпка 4: Build за production
```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

---

## 🗄️ 3. БАЗА ДАННИ {#database}

### SQLite - Автоматична настройка!

**База данни се създава АВТОМАТИЧНО при първо стартиране!**

```bash
cd AMS-chat-web
npm start
# Създава файл: amschat.db
```

### Ръчно създаване (опционално):
```bash
sqlite3 amschat.db < db_setup.sql
```

### Къде се намира базата?
```
AMS-chat-web/amschat.db
```

### Backup на базата:
```bash
# Backup
cp amschat.db amschat.db.backup

# Restore
cp amschat.db.backup amschat.db
```

### Миграция на сървър:
```bash
# На сървъра:
cd /var/www/AMS-chat-web
# База данни се създава автоматично
# Файлът е: /var/www/AMS-chat-web/amschat.db
```

**⚠️ ВАЖНО:** Добави `amschat.db` в `.gitignore` (вече е добавено)

---

## 💳 4. STRIPE - БАНКОВА СМЕТКА {#stripe}

### Стъпка 1: Създай Stripe Account
1. Отиди на: https://dashboard.stripe.com/register
2. Регистрирай се с email

### Стъпка 2: Добави банкова сметка
1. Dashboard → **Settings** → **Payouts**
2. Click **Add bank account**
3. Попълни:
   - **Country:** Bulgaria (или твоята страна)
   - **IBAN:** BG... твоят IBAN
   - **Account holder name:** Твоето име
   - **Bank name:** Име на банката

### Стъпка 3: Верифицирай сметката
- Stripe ще изпрати малка сума (напр. €0.01)
- Виж референтен код в банковия извлечение
- Въведи кода в Stripe за потвърждение

### Стъпка 4: Вземи API Keys
1. Dashboard → **Developers** → **API keys**
2. Копирай:
   ```
   Publishable key: pk_live_51A...
   Secret key: sk_live_51A...
   ```

### Стъпка 5: Добави keys в .env
```env
STRIPE_SECRET_KEY=sk_live_51A...
STRIPE_PUBLISHABLE_KEY=pk_live_51A...
```

### Къде идват парите?
- **Директно в банковата ти сметка!**
- **Кога:** 2-7 дни след плащане
- **Настройка:** Dashboard → Settings → Payouts
  - Daily (всеки ден)
  - Weekly (седмично)
  - Monthly (месечно)

### Такси:
- **EU карти:** 1.4% + €0.25
- **Non-EU карти:** 2.9% + €0.25
- **Пример:** От €5 получаваш ~€4.70

---

## 🔐 5. ADMIN IP ЗАЩИТА {#admin-security}

### Конфигурация в .env файл:

```env
# Добави IP адресите на администраторите (разделени със запетая)
ADMIN_ALLOWED_IPS=123.45.67.89,98.76.54.32,192.168.1.100
```

### Как да намериш твоя IP?
```bash
# От командна линия:
curl ifconfig.me

# Или отиди на:
# https://whatismyipaddress.com/
```

### Как работи?
- Всички admin routes проверяват IP адреса
- Ако IP НЕ Е в списъка → **403 Forbidden**
- Admin страници са невидими за други

### Middleware защита:
```javascript
// routes/admin.js
function checkAdminIP(req, res, next) {
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const allowedIPs = process.env.ADMIN_ALLOWED_IPS.split(',');
  
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
}
```

### Добавяне на нов admin IP:
1. Редактирай `.env`
2. Добави IP: `ADMIN_ALLOWED_IPS=old_ip,new_ip`
3. Restart server: `pm2 restart ams-chat`

---

## 🔒 6. GITHUB ЗАЩИТА {#github-security}

### Private Repository (препоръчително)

#### Стъпка 1: Създай private repo
```bash
# В GitHub:
1. New Repository
2. Repository name: AMS-chat-web
3. ✅ Private (вместо Public)
4. Create repository
```

#### Стъпка 2: Push кода
```bash
cd AMS-chat-web
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:твоят-username/AMS-chat-web.git
git push -u origin main
```

### .gitignore (вече настроен)
```gitignore
# Environment
.env
.env.local

# Database
*.db
*.db-shm
*.db-wal

# Uploads
uploads/

# Node
node_modules/

# Logs
*.log
```

### Защита на .env файла
⚠️ **НИКОГА не commit-вай .env файла!**

```bash
# Провери дали е в .gitignore:
cat .gitignore | grep .env

# Ако случайно си го commit-нал:
git rm --cached .env
git commit -m "Remove .env"
git push
```

### Защита на Stripe Keys
- Използвай Environment Variables на сървъра
- Heroku: Settings → Config Vars
- VPS: .env файл извън git

### Access Control
**Private repo:**
- Само ти виждаш кода
- Можеш да добавиш collaborators

**Public repo (НЕ препоръчвам):**
- Всеки може да види кода
- ⚠️ НЕ слагай sensitive data!

---

## 🚀 7. DEPLOYMENT {#deployment}

### A. VPS Deployment (Hetzner, DigitalOcean)

#### 1. SSH to server
```bash
ssh root@your-server-ip
```

#### 2. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. Install PM2
```bash
npm install -g pm2
```

#### 4. Clone project
```bash
cd /var/www
git clone git@github.com:твоят-username/AMS-chat-web.git
cd AMS-chat-web
npm install --production
```

#### 5. Configure .env
```bash
nano .env
# Добави Stripe keys, admin IPs, etc.
```

#### 6. Start server
```bash
pm2 start server.js --name ams-chat
pm2 save
pm2 startup
```

#### 7. Setup Nginx (reverse proxy)
```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/ams-chat
```

Конфигурация:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ams-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### B. Heroku Deployment

```bash
# Login
heroku login

# Create app
heroku create ams-chat

# Set env vars
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_live_...
heroku config:set ADMIN_ALLOWED_IPS=123.45.67.89

# Deploy
git push heroku main

# Open
heroku open
```

---

## 🔧 Maintenance

### Update code:
```bash
cd /var/www/AMS-chat-web
git pull
npm install
pm2 restart ams-chat
```

### Backup database:
```bash
cp amschat.db "amschat.db.backup-$(date +%Y%m%d)"
```

### View logs:
```bash
pm2 logs ams-chat
```

### Monitor:
```bash
pm2 monit
```

---

## 📞 Support

- **Stripe Help:** https://support.stripe.com
- **PM2 Docs:** https://pm2.keymetrics.io/docs/
- **Nginx Docs:** https://nginx.org/en/docs/

---

Last updated: 2025-11-03
