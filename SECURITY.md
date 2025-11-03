# Security Guidelines

## 🔐 Security Features

### Authentication & Authorization
- **Token-based authentication** using secure random tokens
- **Session management** with expiration (30 days)
- **JWT secrets** for additional security layer
- **Rate limiting** on all endpoints
- **Input validation** on all user inputs

### Data Protection
- **SQL injection prevention** via parameterized queries
- **XSS protection** via HTML escaping
- **CORS configuration** to prevent unauthorized access
- **Helmet.js** for security headers
- **Password hashing** (if you add passwords later)

### Communication Security
- **HTTPS required** in production
- **WebSocket encryption** (WSS protocol)
- **Secure payment processing** via Stripe
- **No sensitive data in logs**

## 🛡️ Best Practices

### Environment Variables
```bash
# NEVER commit .env to git
# Use strong, random secrets (32+ characters)
# Rotate secrets regularly (every 90 days)

SESSION_SECRET=use_crypto_randomBytes_32_here
JWT_SECRET=different_random_secret_here
```

### Database Security
```sql
-- Use dedicated database user with limited permissions
CREATE USER kcychat_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE kcychat TO kcychat_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kcychat_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kcychat_user;

-- Disable remote PostgreSQL access (if not needed)
# In postgresql.conf:
listen_addresses = 'localhost'
```

### Server Hardening
```bash
# Setup firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable

# Install fail2ban
apt install fail2ban
systemctl enable fail2ban

# Disable root SSH login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
systemctl restart sshd

# Keep system updated
apt update && apt upgrade -y
apt autoremove -y
```

### Nginx Security Headers
```nginx
# Add to your nginx config
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;

# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
```

### Application Security
```javascript
// Already implemented in the code:

// 1. Input validation
function validatePhone(phone) {
  return /^\+?[1-9]\d{7,14}$/.test(phone);
}

// 2. Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// 3. Authentication middleware
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // ... validation logic
}

// 4. HTML escaping
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

## 🚨 Security Checklist

### Before Production
- [ ] Change all default passwords
- [ ] Generate new SESSION_SECRET and JWT_SECRET
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Configure firewall (UFW)
- [ ] Setup fail2ban
- [ ] Disable PostgreSQL remote access
- [ ] Setup automated backups
- [ ] Configure rate limiting
- [ ] Test all inputs for validation
- [ ] Remove debug logs
- [ ] Set NODE_ENV=production
- [ ] Configure CORS properly
- [ ] Setup monitoring/alerts

### Monthly Maintenance
- [ ] Update dependencies (`npm update`)
- [ ] Check security logs
- [ ] Review fail2ban logs
- [ ] Rotate secrets (every 3 months)
- [ ] Test backup restoration
- [ ] Review user activity logs
- [ ] Check for suspicious patterns

### In Case of Breach
1. **Immediate Actions:**
   - Disable affected accounts
   - Rotate all secrets immediately
   - Review logs for attack vector
   - Backup current state
   
2. **Investigation:**
   - Identify entry point
   - Check for data exfiltration
   - Review all access logs
   - Document timeline
   
3. **Remediation:**
   - Patch vulnerability
   - Force password resets (if applicable)
   - Notify affected users
   - Update security measures
   
4. **Prevention:**
   - Implement additional monitoring
   - Update security policies
   - Train team on new procedures

## 🔍 Monitoring

### Application Logs
```bash
# Monitor application logs
pm2 logs kcy-chat --lines 100

# Monitor error logs
tail -f /var/log/nginx/error.log

# Monitor PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Security Events to Monitor
- Multiple failed login attempts
- Unusual traffic patterns
- Database query errors
- WebSocket connection floods
- Rate limit hits
- Payment failures
- Unauthorized access attempts

### Recommended Tools
- **Uptime monitoring:** UptimeRobot, Pingdom
- **Error tracking:** Sentry
- **Log aggregation:** Loggly, Papertrail
- **Security scanning:** Snyk, npm audit
- **Firewall:** UFW + fail2ban
- **Intrusion detection:** AIDE, OSSEC

## 📋 Compliance

### GDPR Considerations
- Minimal data collection (only phone numbers)
- User can delete account anytime
- Data retention policy (configurable)
- Right to data portability
- Privacy by design

### Data Retention
```sql
-- Configure in db_setup.sql
-- Currently: Keep last 100 messages per conversation
-- Sessions: 30 days
-- Payment logs: Indefinitely (required for accounting)
```

### To Add (if needed):
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Cookie Consent
- [ ] Data Processing Agreement
- [ ] GDPR compliance documentation

## 🆘 Security Contacts

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: security@yourdomain.com
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours.

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Stripe Security](https://stripe.com/docs/security)
- [Let's Encrypt](https://letsencrypt.org/)

## 🔐 Security Updates

Check for security updates regularly:

```bash
# Check for npm vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update packages
npm update

# Check Node.js version
node -v

# Update PostgreSQL
apt update && apt upgrade postgresql
```

---

**Remember: Security is not a one-time setup, it's an ongoing process.**

Last updated: 2025-11-03
