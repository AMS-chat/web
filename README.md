# KCY Chat - Secure Anonymous Messaging

Минимален чат с месечен абонамент $1/€1

## 🚀 Quick Start

### 1. Инсталация
```bash
npm install
```

### 2. Setup PostgreSQL
```bash
sudo -u postgres psql -f db_setup.sql
```

### 3. Конфигурация

Копирай `.env.example` като `.env` и попълни данните:
```bash
cp .env.example .env
nano .env
```

### 4. Стартиране
```bash
npm start
```

Отвори http://localhost:3000

## 📦 Deployment

### Hetzner Cloud
```bash
# 1. SSH към сървъра
ssh root@your-ip

# 2. Инсталирай Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Инсталирай PostgreSQL
apt install postgresql postgresql-contrib -y

# 4. Setup database
sudo -u postgres psql -f db_setup.sql

# 5. Clone/upload проекта
git clone your-repo или scp -r kcy-chat/ root@your-ip:

# 6. Инсталирай
cd kcy-chat
npm install --production

# 7. Setup .env

# 8. Стартирай с PM2
npm install -g pm2
pm2 start server.js --name kcy-chat
pm2 startup
pm2 save
```

## 💰 Разходи

- Hetzner CPX11: €4.51/месец
- Stripe: 3.3% от транзакции
- Домейн: $0-12/година

**При 10 потребители вече печелиш!**

## 📱 PWA Инсталация

### iOS
Safari → Share → Add to Home Screen

### Android
Chrome → Menu → Install app

## 🔧 Икони

Създай икони 192x192 и 512x512:
- https://www.pwabuilder.com/imageGenerator

Или с ImageMagick:
```bash
convert logo.png -resize 192x192 public/icon-192.png
convert logo.png -resize 512x512 public/icon-512.png
```

## 📊 Features

✅ Анонимен чат (само телефон)
✅ End-to-end encryption ready
✅ Stripe плащания
✅ PWA (инсталира се като app)
✅ Real-time messaging (WebSocket)
✅ Минимални разходи

## 🛠️ Tech Stack

- **Backend:** Node.js + Express + WebSocket
- **Database:** PostgreSQL
- **Payments:** Stripe
- **Frontend:** Vanilla JS (ES5 compatible)
- **PWA:** Service Worker