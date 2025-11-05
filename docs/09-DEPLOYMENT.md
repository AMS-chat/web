# 09 - Production Deployment

## 🚀 Deploy to Production

Пълно ръководство за deploy на AMS Chat на production server.

---

## 📋 Pre-deployment Checklist

- [ ] Change admin password
- [ ] Generate new JWT_SECRET
- [ ] Stripe LIVE keys
- [ ] HTTPS certificate
- [ ] Firewall configured
- [ ] Backups setup
- [ ] Update ADMIN_ALLOWED_IPS
- [ ] Test payments in test mode first

---

## 🖥️ Server Requirements

**Minimum:**
- CPU: 1 core
- RAM: 1GB
- Disk: 10GB
- OS: Ubuntu 20.04+ / Debian 11+

**Recommended:**
- CPU: 2 cores
- RAM: 2GB
- Disk: 20GB SSD

**For 1000+ users:**
- CPU: 4 cores
- RAM: 4GB
- Disk: 50GB SSD

---

## 🔧 Server Setup

### **1. Update System**

```bash
sudo apt update && sudo apt upgrade -y
```

### **2. Install Node.js**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should be v18+
```

### **3. Install SQLite**

```bash
sudo apt install -y sqlite3
sqlite3 --version
```

### **4. Install Nginx**

```bash
sudo apt install -y nginx
```

### **5. Install Certbot (Let's Encrypt)**

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 📦 Deploy Application

### **1. Clone/Upload**

```bash
cd /var/www
sudo mkdir ams-chat
sudo chown $USER:$USER ams-chat
cd ams-chat

# Upload files (scp, rsync, git clone, etc.)
scp -r AMS-chat-web/* user@server:/var/www/ams-chat/
```

### **2. Install Dependencies**

```bash
npm install --production
```

### **3. Setup Database**

```bash
sqlite3 chat.db < db_setup.sql
chmod 600 chat.db
```

### **4. Configure .env**

```bash
cp .env.example .env
nano .env
```

```env
NODE_ENV=production
PORT=3000
DB_PATH=/var/www/ams-chat/chat.db
JWT_SECRET=<GENERATE_NEW_SECRET>
STRIPE_SECRET_KEY=sk_live_...  # LIVE MODE!
STRIPE_PUBLISHABLE_KEY=pk_live_...
ADMIN_ALLOWED_IPS=Your.IP.Address
```

### **5. Change Admin Password**

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourStrongPassword', 10, (e, h) => console.log(h));"

sqlite3 chat.db
```

```sql
UPDATE admin_users SET password_hash = '<NEW_HASH>' WHERE username = 'admin';
.quit
```

---

## 🔐 SSL/TLS Setup

### **Option 1: Certbot (Let's Encrypt)**

```bash
# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### **Option 2: Cloudflare**

1. Add domain to Cloudflare
2. Change nameservers
3. SSL/TLS mode: **Full**
4. Auto HTTPS Rewrites: **ON**

---

## 🌐 Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/ams-chat
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Static files
    location /uploads {
        alias /var/www/ams-chat/uploads;
        expires 24h;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/ams-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔄 Process Manager (PM2)

### **Install PM2:**

```bash
sudo npm install -g pm2
```

### **Start Application:**

```bash
cd /var/www/ams-chat
pm2 start server.js --name ams-chat
pm2 save
pm2 startup  # Follow instructions
```

### **Monitoring:**

```bash
pm2 status
pm2 logs ams-chat
pm2 monit
```

### **Restart:**

```bash
pm2 restart ams-chat
```

---

## 🔥 Firewall Setup

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
sudo ufw status
```

---

## 📊 Monitoring Setup

### **Log Rotation:**

```bash
sudo nano /etc/logrotate.d/ams-chat
```

```
/var/www/ams-chat/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
```

### **System Monitoring:**

```bash
# Install htop
sudo apt install htop

# Check resources
htop
df -h  # Disk space
free -h  # Memory
```

---

## 🗄️ Database Backups

### **Automated Backups:**

```bash
sudo mkdir -p /backup/ams-chat
sudo chown $USER:$USER /backup/ams-chat

crontab -e
```

```cron
# Daily backup at 2 AM
0 2 * * * sqlite3 /var/www/ams-chat/chat.db ".backup /backup/ams-chat/chat-$(date +\%Y\%m\%d).db"

# Keep only last 30 days
0 3 * * * find /backup/ams-chat -name "chat-*.db" -mtime +30 -delete
```

---

## 🔄 Updates & Maintenance

### **Update Application:**

```bash
cd /var/www/ams-chat
git pull  # or upload new files
npm install --production
pm2 restart ams-chat
```

### **Update Dependencies:**

```bash
npm update
pm2 restart ams-chat
```

### **Database Migration:**

```bash
sqlite3 chat.db < migration.sql
```

---

## 📈 Performance Optimization

### **Node.js:**

```bash
# Increase memory limit
pm2 start server.js --name ams-chat --max-memory-restart 500M
```

### **Nginx Caching:**

```nginx
# In server block
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### **Database Optimization:**

```bash
# Vacuum regularly
sqlite3 chat.db "VACUUM;"

# Add to cron
0 4 * * 0 sqlite3 /var/www/ams-chat/chat.db "VACUUM;"
```

---

## 🚨 Emergency Procedures

### **Server Down:**

```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs ams-chat --lines 100

# Restart
pm2 restart ams-chat
```

### **Database Locked:**

```bash
# Stop app
pm2 stop ams-chat

# Check for locks
lsof /var/www/ams-chat/chat.db

# Kill if needed
kill -9 <PID>

# Restart
pm2 start ams-chat
```

### **Out of Disk Space:**

```bash
# Check space
df -h

# Clean old files
find /var/www/ams-chat/uploads -mtime +7 -delete
find /backup/ams-chat -name "chat-*.db" -mtime +30 -delete

# Clean logs
pm2 flush ams-chat
```

---

## ✅ Post-Deployment Checklist

- [ ] Application running (`pm2 status`)
- [ ] HTTPS working (https://yourdomain.com)
- [ ] Admin login working
- [ ] Test payment (test mode first!)
- [ ] Webhooks configured
- [ ] Backups running
- [ ] Monitoring enabled
- [ ] Firewall active

---

**Следващо:** [10-TROUBLESHOOTING.md](./10-TROUBLESHOOTING.md) - Решения на проблеми
