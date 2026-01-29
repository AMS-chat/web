# 💰 AMS Chat - Crypto Payments Documentation v00018

## 🔐 Overview

AMS Chat supports payments in **5 cryptocurrencies:**
- Bitcoin (BTC)
- Ethereum (ETH)
- Binance Coin (BNB)
- KCY_MEME token (BSC)
- KCY_AMS token (BSC)

**Payment Model:** Direct wallet-to-wallet transfers  
**Verification:** On-demand (user clicks "Verify Payment")  
**No 3rd party:** No Coinbase Commerce, no payment processors

---

## 📦 SECTION 1: Installation Requirements

### What you need:

#### 1. **Treasury Wallets** (Your wallets where users send money)
You need **5 cryptocurrency wallets:**

```
BTC:       bc1q...  (Bitcoin SegWit address)
ETH:       0x...    (Ethereum address)
BNB:       0x...    (Binance Smart Chain address)
KCY_MEME:  0x...    (BSC address - same as BNB)
KCY_AMS:   0x...    (BSC address - same as BNB)
```

**How to get:**
- **BTC:** Use any Bitcoin wallet (Electrum, Bitcoin Core, hardware wallet)
- **ETH:** Use MetaMask, MyEtherWallet, or hardware wallet
- **BNB/Tokens:** Use MetaMask on Binance Smart Chain network

**Security:**
- ✅ Use cold storage for large amounts
- ✅ Never share private keys
- ✅ Consider multi-sig for high-value wallets

---

#### 2. **API Keys** (Optional but recommended)

For blockchain verification, you need FREE API keys:

**Etherscan API (for ETH):**
1. Go to: https://etherscan.io/myapikey
2. Register free account
3. Create API key
4. Limit: 100,000 requests/day (free tier)

**BSCScan API (for BNB + tokens):**
1. Go to: https://bscscan.com/myapikey
2. Register free account
3. Create API key
4. Limit: 100,000 requests/day (free tier)

**Bitcoin:** Uses blockchain.info API (no key needed)

**Without API keys:**
- Blockchain verification returns placeholder
- Payment verification won't work properly
- **Recommendation:** Get the free API keys!

---

#### 3. **Token Contract Addresses**

If you have your own KCY tokens, you need contract addresses:

```
KCY_MEME contract: 0x... (BSC network)
KCY_AMS contract:  0x... (BSC network)
```

**How to get:**
- Deploy token on BSC using Remix/Truffle
- Or use existing token contracts

---

#### 4. **Node.js Packages** (Already included)

No additional packages needed! Crypto functionality uses:
- Built-in `https` module for API calls
- No external crypto libraries required

---

## ⚙️ SECTION 2: Configuration

### File: `public/config.js`

**Location:** `/var/www/ams-chat-web/public/config.js`

#### Step 1: Add your treasury wallets:
```javascript
const CRYPTO_CONFIG = {
  TREASURY_WALLETS: {
    BTC: 'bc1qYOUR_BTC_ADDRESS',              // ← YOUR BTC WALLET
    ETH: '0xYOUR_ETH_ADDRESS',                // ← YOUR ETH WALLET
    BNB: '0xYOUR_BNB_ADDRESS',                // ← YOUR BNB WALLET
    KCY_MEME: '0xYOUR_BNB_ADDRESS',           // ← SAME AS BNB (BSC)
    KCY_AMS: '0xYOUR_BNB_ADDRESS'             // ← SAME AS BNB (BSC)
  },
```

**Important:** BNB, KCY_MEME, and KCY_AMS use **same wallet address** (BSC network)

---

#### Step 2: Add token contract addresses:
```javascript
  TOKEN_ADDRESSES: {
    KCY_MEME: '0xYOUR_KCY_MEME_CONTRACT',     // ← TOKEN CONTRACT ON BSC
    KCY_AMS: '0xYOUR_KCY_AMS_CONTRACT'        // ← TOKEN CONTRACT ON BSC
  },
```

---

#### Step 3: Set pricing (in crypto amounts):
```javascript
  PRICING: {
    LOGIN: {
      USD: 5,                    // Reference price
      EUR: 5,                    // Reference price
      BTC: 0.0001,               // ← Calculate based on BTC price (~$5)
      ETH: 0.002,                // ← Calculate based on ETH price (~$5)
      BNB: 0.01,                 // ← Calculate based on BNB price (~$5)
      KCY_MEME: 1000,            // ← Your token amount
      KCY_AMS: 500               // ← Your token amount
    },
    EMERGENCY: {
      USD: 50,                   // Reference price
      EUR: 50,                   // Reference price
      BTC: 0.001,                // ← Calculate based on BTC price (~$50)
      ETH: 0.02,                 // ← Calculate based on ETH price (~$50)
      BNB: 0.1,                  // ← Calculate based on BNB price (~$50)
      KCY_MEME: 10000,           // ← Your token amount
      KCY_AMS: 5000              // ← Your token amount
    }
  },
```

**Important:** Prices must be **EXACT amounts**. No summing, no partial payments!

---

#### Step 4: Add API keys (optional but recommended):
```javascript
  API_KEYS: {
    ETHERSCAN: 'YOUR_ETHERSCAN_API_KEY',     // ← From etherscan.io
    BSCSCAN: 'YOUR_BSCSCAN_API_KEY'          // ← From bscscan.com
  }
};
```

---

### Configuration Example (Complete):
```javascript
const CRYPTO_CONFIG = {
  TREASURY_WALLETS: {
    BTC: 'bc1q1234567890abcdef',
    ETH: '0x1234567890abcdef1234567890abcdef12345678',
    BNB: '0x1234567890abcdef1234567890abcdef12345678',
    KCY_MEME: '0x1234567890abcdef1234567890abcdef12345678',
    KCY_AMS: '0x1234567890abcdef1234567890abcdef12345678'
  },
  
  TOKEN_ADDRESSES: {
    KCY_MEME: '0xabcdef1234567890abcdef1234567890abcdef12',
    KCY_AMS: '0xfedcba0987654321fedcba0987654321fedcba09'
  },
  
  PRICING: {
    LOGIN: {
      USD: 5, EUR: 5,
      BTC: 0.0001, ETH: 0.002, BNB: 0.01,
      KCY_MEME: 1000, KCY_AMS: 500
    },
    EMERGENCY: {
      USD: 50, EUR: 50,
      BTC: 0.001, ETH: 0.02, BNB: 0.1,
      KCY_MEME: 10000, KCY_AMS: 5000
    }
  },
  
  EXPLORERS: {
    BTC: 'https://blockchain.info',
    ETH: 'https://api.etherscan.io/api',
    BNB: 'https://api.bscscan.com/api'
  },
  
  API_KEYS: {
    ETHERSCAN: 'ABC123XYZ789',
    BSCSCAN: 'DEF456UVW012'
  }
};
```

**Save and restart:**
```bash
pm2 restart ams-chat
```

---

## 💳 SECTION 3: How Crypto Payments Work

### Payment Flow:

```
1. User registers → Default UNPAID status

2. User navigates to Payment page

3. User selects cryptocurrency (e.g., BTC)

4. System shows:
   - Amount to send (exact)
   - Treasury wallet address
   - QR code

5. User sends payment from their wallet

6. User clicks "Verify Payment" button

7. System checks blockchain:
   - Queries blockchain API
   - Looks for EXACT amount
   - To EXACT treasury address
   - From user's registered wallet

8. If found:
   - subscription_active = 1
   - paid_until = +30 days
   - User gets full access

9. If not found:
   - Error message
   - User can retry
```

---

### Verification Logic:

**CRITICAL RULES:**
1. Amount must be EXACT (e.g., 0.0001 BTC, not 0.00011)
2. Payment must be to treasury wallet
3. Payment must be from user's registered wallet
4. Recent transactions only (last 24 hours checked)

**Partial payments:** Rejected  
**Overpayments:** Rejected  
**Multiple small payments:** Not summed, rejected

---

## 🔍 SECTION 4: Testing Crypto Payments

### Test Mode:

Enable test mode to bypass payments:
```bash
echo "TEST_MODE=true" >> .env
pm2 restart ams-chat
```

**In test mode:**
- All users have full access
- No payment required
- Crypto verification disabled
- Emergency button disabled

**Disable test mode:**
```bash
sed -i 's/TEST_MODE=true/TEST_MODE=false/' .env
pm2 restart ams-chat
```

---

### Testing with Real Crypto (Testnet):

#### 1. Use testnet addresses:
```javascript
TREASURY_WALLETS: {
  BTC: 'tb1q...',  // Bitcoin testnet
  ETH: '0x...',    // Goerli/Sepolia testnet
  BNB: '0x...'     // BSC testnet
}
```

#### 2. Get testnet funds:
- **BTC:** https://testnet-faucet.mempool.co/
- **ETH:** https://goerlifaucet.com/
- **BNB:** https://testnet.binance.org/faucet-smart

#### 3. Configure testnet explorers:
```javascript
EXPLORERS: {
  BTC: 'https://blockstream.info/testnet',
  ETH: 'https://api-goerli.etherscan.io/api',
  BNB: 'https://api-testnet.bscscan.com/api'
}
```

---

## 🛠️ SECTION 5: Troubleshooting

### Payment verification fails:

**Check 1:** API keys correct?
```bash
curl "https://api.etherscan.io/api?module=account&action=balance&address=0x...&apikey=YOUR_KEY"
```

**Check 2:** Treasury wallet correct in config.js?
```bash
grep TREASURY_WALLETS public/config.js
```

**Check 3:** User sent exact amount?
```bash
# Check user's transaction on blockchain explorer
```

**Check 4:** Recent transaction? (last 24 hours)

---

### User can't find payment page:

**Check:** `/public/payment.html` exists?
```bash
ls -la public/payment.html
```

---

### Blockchain verification returns "not found":

**Cause:** API rate limit or wrong API key

**Solution:**
1. Check API key valid
2. Check rate limit not exceeded
3. Wait and retry

---

## 🔐 SECTION 6: Security Best Practices

### Treasury Wallets:
- ✅ Use hardware wallets for large amounts
- ✅ Enable 2FA on exchange accounts
- ✅ Never share private keys
- ✅ Regular security audits
- ✅ Multi-sig for high-value wallets

### API Keys:
- ✅ Never commit to git
- ✅ Store in environment variables
- ✅ Rotate periodically
- ✅ Monitor usage

### Payment Verification:
- ✅ Always verify exact amount
- ✅ Check recent transactions only
- ✅ Log all verification attempts
- ✅ Monitor for suspicious patterns

---

## 📊 SECTION 7: Monitoring & Maintenance

### Check received payments:
```bash
# View users who paid
sqlite3 database/amschat.db "SELECT phone, paid_until, payment_currency FROM users WHERE subscription_active = 1;"
```

### Monitor wallet balances:
- Check blockchain explorers regularly
- Transfer funds to cold storage
- Keep operating balance only

### Update prices:
```bash
# Edit config.js with current crypto prices
nano public/config.js

# Restart server
pm2 restart ams-chat
```

**Recommendation:** Update prices weekly based on market rates

---

## 📁 File Locations

```
/var/www/ams-chat-web/
├── public/
│   ├── config.js              ← CRYPTO CONFIGURATION (EDIT THIS!)
│   ├── payment.html           ← Payment page
│   └── payment-override.html  ← Admin manual activation
├── routes/
│   └── payment.js             ← Payment verification logic
└── database/
    └── db_setup.sql           ← Includes crypto wallet fields
```

---

## 🔗 Related Documentation

- **Database:** `docs/02-DATABASE.md` (crypto wallet fields)
- **Configuration:** `docs/03-ENVIRONMENT.md`
- **Testing:** `docs/COMPLETE-TESTING-GUIDE.md`
- **Deployment:** `docs/09-DEPLOYMENT.md`

---

**Version:** 00018  
**Last Updated:** 2026-01-29  
**Status:** ✅ Production Ready
