# AMS Chat - Secure Anonymous Messaging 🔒

Минимален, сигурен чат с месечен абонамент $1/€1

## ✨ Новости във версия 2.0

### 🔐 Security Improvements
- ✅ **JWT Session Management** - Token-based authentication
- ✅ **Rate Limiting** - Protection срещу abuse
- ✅ **Input Validation** - Server-side валидация на всички inputs
- ✅ **Helmet.js** - Security headers
- ✅ **CORS Configuration** - Правилна конфигурация на CORS
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **XSS Protection** - HTML escaping

### 💳 Payment Improvements
- ✅ **Real Stripe Integration** - Stripe Elements вместо demo
- ✅ **Payment Intents API** - Модерен Stripe workflow
- ✅ **Payment Logging** - История на плащанията
- ✅ **Test Cards Support** - Лесно тестване

### 🎨 UX Improvements
- ✅ **Loading States** - Spinners и feedback
- ✅ **Toast Notifications** - User-friendly съобщения
- ✅ **Session Persistence** - Auto-login при refresh
- ✅ **Logout Functionality** - Правилен logout
- ✅ **Improved PWA** - По-добър offline support
- ✅ **Better Error Handling** - Информативни error messages

### 📱 Features
- ✅ **Message Read Status** - Marking messages as read
- ✅ **Unread Count** - Badge за непрочетени съобщения
- ✅ **Friends Validation** - Само активни потребители
- ✅ **Message Limits** - Protection срещу spam (5000 chars max)
- ✅ **Auto-reconnect** - WebSocket auto-reconnection
- ✅ **Responsive Design** - Подобрен mobile experience

## 🚀 Quick Start

### 1. Инсталация

```bash
# Clone проекта
git clone <your-repo>
cd ams-chat-improved

# Инсталирай dependencies
npm install
```

### 2. PostgreSQL Setup

```bash
# Инсталирай PostgreSQL (ако не е инсталиран)
# Ubuntu/Debian:
sudo apt install postgresql postgresql-contrib -y

# macOS:
brew install postgresql

# Стартирай PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql # macOS

# Създай база данни и таблици
sudo -u postgres psql -f db_setup.sql
```

### 3. Stripe Configuration

1. Създай account в [Stripe](https://dashboard.stripe.com/register)
2. Вземи API keys от [Dashboard](https://dashboard.stripe.com/test/apikeys)
3. Копирай ги в `.env` файла

### 4. Environment Configuration

```bash
# Копирай example файла
cp .env.example .env

# Редактирай .env и попълни:
nano .env
```

**Важно:** Попълни всички променливи!

```env
DATABASE_URL=postgresql://amschat_user:your_password@localhost:5432/amschat
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
PORT=3000
NODE_ENV=development
SESSION_SECRET=генерирай_random_32+_символа
JWT_SECRET=генерирай_различен_random_32+_символа
ALLOWED_ORIGINS=http://localhost:3000
```

**Генериране на secrets:**
```bash
# За SESSION_SECRET и JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Стартиране

```bash
# Development mode (с nodemon)
npm run dev

# Production mode
npm start
```

Отвори **http://localhost:3000**

## 🧪 Testing

### Test Cards (Stripe)

Успешни плащания:
- **4242 4242 4242 4242** (Visa)
- **5555 5555 5555 4444** (Mastercard)

Грешки:
- **4000 0000 0000 0002** (Card declined)

**Експирация:** Всяка бъдеща дата (напр. 12/25)  
**CVV:** Всяко 3-цифрено число (напр. 123)

### Test Flow

1. **Регистрация:**
   - Отвори app
   - Въведи телефонен номер (напр. +359888999000)
   - Click "Вход"

2. **Плащане:**
   - Въведи test card: 4242 4242 4242 4242
   - Експирация: 12/25
   - CVV: 123
   - Click "Плати $1/месец"

3. **Chat:**
   - Добави приятел (+359888999111)
   - Изпрати съобщение
   - Провери real-time delivery

## 📦 Deployment

### Hetzner Cloud (Препоръчано)

**Cost:** €4.51/месец (CPX11)

```bash
# 1. SSH към сървъра
ssh root@your-server-ip

# 2. Инсталирай Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Инсталирай PostgreSQL
apt install postgresql postgresql-contrib -y

# 4. Setup PostgreSQL
sudo -u postgres psql -f db_setup.sql

# Създай user и password
sudo -u postgres psql
CREATE USER amschat_user WITH PASSWORD 'your_secure_password';
ALTER DATABASE amschat OWNER TO amschat_user;
\q

# 5. Clone проекта
git clone <your-repo> /var/www/ams-chat
cd /var/www/ams-chat

# 6. Инсталирай dependencies
npm install --production

# 7. Setup .env
nano .env
# Попълни production данни!
# NODE_ENV=production
# DATABASE_URL=postgresql://amschat_user:password@localhost:5432/amschat
# ALLOWED_ORIGINS=https://yourdomain.com

# 8. Инсталирай PM2
npm install -g pm2

# 9. Стартирай с PM2
pm2 start server.js --name ams-chat

# 10. Auto-start при reboot
pm2 startup
pm2 save

# 11. Nginx (reverse proxy)
apt install nginx -y

# Създай config
nano /etc/nginx/sites-available/ams-chat
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/ams-chat /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 12. SSL Certificate (Let's Encrypt)
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Автоматично renewal
certbot renew --dry-run
```

### Digital Ocean / AWS / Other

Същият процес, но:
- Използвай техния managed PostgreSQL (по-лесно)
- Настрой firewall rules
- Enable backup snapshots

## 💰 Разходи Breakdown

### Минимални разходи (10 потребители):
- **Хостинг:** €4.51/месец (Hetzner CPX11)
- **Домейн:** ~$1/месец (12/година)
- **Stripe fees:** 3.3% = $0.33 на транзакция
- **Total месечни:** ~€6/месец

**Приход:** 10 × $1 = $10/месец  
**Печалба:** $10 - €6 ≈ **€2-3/месец чиста печалба**

### Scale up (100 потребители):
- **Хостинг:** €9.51/месец (CPX21)
- **Приход:** $100/месец
- **Stripe fees:** $3.30
- **Печалба:** ~€86/месец 🚀

## 🔧 Production Checklist

### Security
- [ ] Смени всички passwords в `.env`
- [ ] Генерирай нови SESSION_SECRET и JWT_SECRET
- [ ] Setup HTTPS (Let's Encrypt)
- [ ] Настрой firewall (UFW)
  ```bash
  ufw allow 22    # SSH
  ufw allow 80    # HTTP
  ufw allow 443   # HTTPS
  ufw enable
  ```
- [ ] Disable PostgreSQL remote access (ако не използваш managed DB)
- [ ] Setup PostgreSQL backups
  ```bash
  # Daily backup cron
  0 2 * * * pg_dump amschat > /backups/amschat_$(date +\%Y\%m\%d).sql
  ```
- [ ] Setup fail2ban
  ```bash
  apt install fail2ban -y
  systemctl enable fail2ban
  ```

### Stripe
- [ ] Премини от test mode на live mode
- [ ] Добави webhook endpoints (за subscription management)
- [ ] Setup Stripe webhooks за payment.succeeded

### Monitoring
- [ ] Setup PM2 monitoring: `pm2 monitor`
- [ ] Setup uptime monitoring (UptimeRobot, Pingdom)
- [ ] Setup error logging (Sentry)
- [ ] Setup analytics (optional)

### Database
- [ ] Enable scheduled cleanups:
  ```sql
  -- Add to crontab
  0 3 * * * psql -U amschat_user -d amschat -c "SELECT cleanup_old_messages();"
  0 * * * * psql -U amschat_user -d amschat -c "SELECT cleanup_expired_sessions();"
  ```
- [ ] Setup automated backups
- [ ] Test backup restoration

### Performance
- [ ] Enable gzip compression в Nginx
- [ ] Setup CDN за static assets (optional)
- [ ] Optimize database indexes
- [ ] Monitor memory/CPU usage

## 📱 PWA Installation

### iOS
1. Safari → Share → Add to Home Screen
2. App icon се появява на Home Screen

### Android
1. Chrome → Menu (⋮) → Install app
2. Или банер "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Address bar → Install icon
2. Или Settings → Install AMS Chat

## 🎨 Customization

### Branding
- Смени иконите: `/public/icon-192.png`, `/public/icon-512.png`
- Промени цветовете в `tailwind.config` (в HTML)
- Промени app име в `manifest.json`

### Pricing
- Промени сумата в `server.js` (line ~280):
  ```javascript
  amount: 100, // $1.00 (in cents)
  ```
- Промени текста в `index.html`

## 🐛 Troubleshooting

### WebSocket connection failed
```bash
# Провери firewall
sudo ufw status

# Провери Nginx config
nginx -t

# Провери logs
pm2 logs ams-chat
```

### Database connection error
```bash
# Провери PostgreSQL status
systemctl status postgresql

# Провери connection string
psql "postgresql://amschat_user:password@localhost:5432/amschat"

# Провери logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Payment not working
1. Провери Stripe API keys в `.env`
2. Провери console за Stripe errors
3. Тествай с Stripe test cards
4. Провери Stripe Dashboard logs

### Can't add friend
- User трябва да има активен subscription
- Телефонният номер трябва да е валиден
- Не можеш да добавиш себе си

## 📊 Database Maintenance

### Manual cleanup
```sql
-- Cleanup old messages (keep last 100 per conversation)
SELECT cleanup_old_messages();

-- Cleanup expired sessions
SELECT cleanup_expired_sessions();

-- Check database size
SELECT pg_size_pretty(pg_database_size('amschat'));

-- Vacuum database
VACUUM ANALYZE;
```

### Backup & Restore
```bash
# Backup
pg_dump -U amschat_user amschat > backup.sql

# Restore
psql -U amschat_user amschat < backup.sql
```

## 🔄 Updates

```bash
# Stop app
pm2 stop ams-chat

# Pull updates
git pull

# Install new dependencies (if any)
npm install --production

# Run migrations (if any)
psql -U amschat_user -d amschat -f migrations/xxx.sql

# Restart
pm2 restart ams-chat

# Check logs
pm2 logs ams-chat
```

## 📞 Support

- **Issues:** GitHub Issues
- **Email:** your-email@example.com
- **Documentation:** [Docs Link]

## 📄 License

MIT License - свободен за използване и модификация

## 🙏 Credits

- **Stripe** - Payment processing
- **Tailwind CSS** - Styling
- **PostgreSQL** - Database
- **Node.js** - Backend

---

**Made with ❤️ for secure, anonymous communication**

🚀 Happy chatting!
