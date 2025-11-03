# 🚀 AMS Chat v2.0 - Quick Start Guide

## ⚡ Бърз старт (5 минути)

### 1. Инсталация
```bash
cd ams-chat-improved
npm install
```

### 2. База данни
```bash
# Инсталирай PostgreSQL (ако няма)
sudo apt install postgresql postgresql-contrib

# Setup база данни
sudo -u postgres psql -f db_setup.sql
```

### 3. Конфигурация
```bash
# Копирай .env.example
cp .env.example .env

# Генерирай secrets
./dev.sh env:generate

# Редактирай .env и добави:
# - Stripe API keys
# - Database URL
# - Secrets от горната команда
nano .env
```

### 4. Stripe Setup
1. Отиди на https://dashboard.stripe.com/register
2. Вземи API keys от https://dashboard.stripe.com/test/apikeys
3. Копирай ги в `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### 5. Стартирай
```bash
npm run dev
```

Отвори **http://localhost:3000** 🎉

---

## 🧪 Тестване

### Test карти (Stripe)
- **Успех:** 4242 4242 4242 4242
- **Отказана:** 4000 0000 0000 0002
- **Експирация:** 12/25 (всяка бъдеща дата)
- **CVV:** 123 (всяко 3-цифрено число)

### Test сценарий
1. Въведи телефон: `+359888999000`
2. Плати с test картата
3. Добави приятел: `+359888999111`
4. Изпрати съобщение

---

## 📁 Структура на проекта

```
ams-chat-improved/
├── server.js              # Backend сървър
├── db_setup.sql          # Database schema
├── package.json          # Dependencies
├── .env.example          # Environment template
├── README.md             # Пълна документация
├── SECURITY.md           # Security guidelines
├── deploy.sh             # Production deployment
├── dev.sh                # Development helper
└── public/
    ├── index.html        # Frontend app
    ├── manifest.json     # PWA manifest
    ├── sw.js             # Service Worker
    ├── icon-192.png      # App icon (192x192)
    └── icon-512.png      # App icon (512x512)
```

---

## ✨ Новости във версия 2.0

### 🔐 Security
- ✅ Token-based authentication
- ✅ Session management
- ✅ Rate limiting
- ✅ Input validation
- ✅ XSS protection
- ✅ SQL injection prevention
- ✅ Helmet.js security headers

### 💳 Payments
- ✅ **Real Stripe integration** (Stripe Elements)
- ✅ Payment Intents API
- ✅ Payment logging
- ✅ Test mode support

### 🎨 UX
- ✅ Loading states
- ✅ Toast notifications
- ✅ Auto-login
- ✅ Logout function
- ✅ Better error handling
- ✅ Improved PWA

### 📱 Features
- ✅ Message read status
- ✅ Unread count badges
- ✅ Friend validation
- ✅ Auto-reconnect WebSocket
- ✅ Message limits (5000 chars)
- ✅ Responsive design

---

## 🛠️ Development Commands

```bash
./dev.sh start          # Start dev server
./dev.sh db:setup       # Setup database
./dev.sh db:reset       # Reset database
./dev.sh db:backup      # Backup database
./dev.sh test:stripe    # Show test cards
./dev.sh env:generate   # Generate secrets
./dev.sh check          # Check setup
./dev.sh icons [img]    # Generate icons
```

---

## 🚀 Production Deployment

### Option 1: Automated (Hetzner/DigitalOcean/AWS)
```bash
./deploy.sh YOUR_SERVER_IP root
```

### Option 2: Manual
Виж **README.md** → "Deployment" секция

### След deployment:
1. SSH към сървъра
2. Редактирай `.env` с production данни
3. Рестартирай: `pm2 restart ams-chat`
4. Setup SSL: `certbot --nginx -d yourdomain.com`

---

## 💰 Бизнес модел

### Разходи (10 потребители)
- Hetzner CPX11: **€4.51/месец**
- Домейн: **~$1/месец**
- Stripe fees: **$0.33/транзакция**
- **Total: ~€6/месец**

### Приходи
- 10 потребители × $1 = **$10/месец**
- **Печалба: €2-3/месец**

### Scale (100 потребители)
- Хостинг: €9.51/месец
- Приходи: $100/месец
- **Печалба: ~€86/месец** 🚀

---

## 📞 Support & Help

### Проблеми?
```bash
# Check status
./dev.sh check

# View logs
pm2 logs ams-chat

# Database issues
sudo systemctl status postgresql

# Test Stripe
./dev.sh test:stripe
```

### Common Issues

**WebSocket connection failed**
- Провери firewall: `sudo ufw status`
- Провери Nginx config: `nginx -t`

**Database error**
- Провери PostgreSQL: `systemctl status postgresql`
- Test connection: `psql -U postgres -d amschat`

**Payment not working**
- Провери Stripe keys в `.env`
- Използвай test cards
- Виж Stripe Dashboard logs

---

## 📚 Документация

- **README.md** - Пълна документация
- **SECURITY.md** - Security guidelines
- **Stripe Docs** - https://stripe.com/docs
- **PostgreSQL Docs** - https://www.postgresql.org/docs/

---

## ✅ Production Checklist

Преди deployment:
- [ ] Копирай `.env.example` → `.env`
- [ ] Добави Stripe keys (live mode)
- [ ] Генерирай нови secrets
- [ ] Настрой DATABASE_URL
- [ ] Промени ALLOWED_ORIGINS
- [ ] Setup HTTPS
- [ ] Enable firewall
- [ ] Configure backups
- [ ] Test всичко в staging

---

## 🎯 Next Steps

1. **Локално тестване:**
   - Setup база данни
   - Конфигурирай .env
   - Тествай с Stripe test cards
   - Провери всички функции

2. **Deployment:**
   - Избери hosting (Hetzner препоръчан)
   - Deploy с `./deploy.sh`
   - Конфигурирай production .env
   - Setup SSL certificate

3. **Go Live:**
   - Премини на Stripe live mode
   - Добави домейн
   - Маркетинг & промоция
   - Monitor & optimize

---

**🎉 Готово! Успех с проекта!**

За въпроси: Виж README.md или пиши issue в GitHub.

---

Last updated: 2025-11-03
Made with ❤️ for secure communication
