const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const geoip = require('geoip-lite');

function getPriceForIP(ip) {
  const geo = geoip.lookup(ip);
  const euCountries = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
  
  if (geo && euCountries.includes(geo.country)) {
    return { amount: 500, currency: 'eur', country: geo.country }; // €5
  }
  return { amount: 500, currency: 'usd', country: geo?.country || 'US' }; // $5
}

function createPaymentRoutes(db) {
  const router = express.Router();

  // Get Stripe publishable key
  router.get('/stripe-key', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  });

  // Get pricing for user's location
  router.get('/pricing', (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const pricing = getPriceForIP(clientIP);
    
    res.json({
      amount: pricing.amount / 100,
      currency: pricing.currency.toUpperCase(),
      country: pricing.country,
      displayPrice: pricing.currency === 'eur' ? '€5' : '$5'
    });
  });

  // Create payment intent
  router.post('/create-intent', async (req, res) => {
    try {
      const { phone, paymentType } = req.body; // paymentType: 'new', 'renewal', 'unblock'
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      if (!phone) {
        return res.status(400).json({ error: 'Phone required' });
      }

      const pricing = getPriceForIP(clientIP);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: pricing.amount,
        currency: pricing.currency,
        metadata: { 
          phone, 
          country: pricing.country,
          paymentType: paymentType || 'new'
        },
        automatic_payment_methods: { enabled: true },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: pricing.amount / 100,
        currency: pricing.currency.toUpperCase()
      });
    } catch (err) {
      console.error('Payment intent error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Confirm payment
  router.post('/confirm', async (req, res) => {
    try {
      const { phone, paymentIntentId, paymentType } = req.body;
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      if (!phone || !paymentIntentId) {
        return res.status(400).json({ error: 'Phone and payment ID required' });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: 'Payment not completed' });
      }

      if (paymentIntent.metadata.phone !== phone) {
        return res.status(400).json({ error: 'Phone mismatch' });
      }

      const pricing = getPriceForIP(clientIP);
      const user = db.prepare('SELECT phone, paid_until, is_blocked FROM users WHERE phone = ?').get(phone);

      // Calculate new paid_until date
      let paidUntil = new Date();
      
      if (user && new Date(user.paid_until) > new Date()) {
        // Extend existing subscription
        paidUntil = new Date(user.paid_until);
      }
      
      paidUntil.setMonth(paidUntil.getMonth() + 1); // +1 month

      if (user) {
        // Update existing user
        db.prepare(`
          UPDATE users 
          SET paid_until = ?, 
              last_login = datetime("now"),
              is_blocked = 0,
              blocked_reason = NULL,
              failed_login_attempts = 0,
              payment_amount = ?,
              payment_currency = ?
          WHERE phone = ?
        `).run(paidUntil.toISOString(), paymentIntent.amount / 100, paymentIntent.currency, phone);
      } else {
        // Should not happen, but handle gracefully
        return res.status(400).json({ error: 'User not found - complete registration first' });
      }

      // Log payment
      db.prepare(`
        INSERT INTO payment_logs (phone, amount, currency, stripe_payment_id, status, country_code, ip_address, payment_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        phone, 
        paymentIntent.amount / 100, 
        paymentIntent.currency, 
        paymentIntentId, 
        'succeeded', 
        pricing.country, 
        clientIP,
        paymentType || 'renewal'
      );

      // Create session token
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const { v4: uuidv4 } = require('uuid');
      db.prepare(`
        INSERT INTO sessions (id, phone, token, expires_at, device_type)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), phone, token, expiresAt.toISOString(), 'web');

      res.json({
        success: true,
        token,
        paidUntil: paidUntil.toISOString(),
        unblocked: user?.is_blocked ? true : false
      });
    } catch (err) {
      console.error('Payment confirm error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createPaymentRoutes;
// Add this to the existing routes/payment.js file
// Insert this BEFORE the final "return router;" line

// ============================================
// CRYPTO PAYMENT ROUTES (KCY1 Token)
// ============================================

// Crypto payment confirmation
router.post('/crypto-confirm', async (req, res) => {
  try {
    const { userId, phone, txHash, walletAddress, amount, tokenAddress } = req.body;

    if (!userId || !phone || !txHash || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND phone = ?').get(userId, phone);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if payment already processed (prevent double-spending)
    const existingPayment = db.prepare(
      'SELECT * FROM payment_logs WHERE stripe_payment_id = ?'
    ).get(txHash);

    if (existingPayment) {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    // Calculate new paid_until date
    let paidUntil = new Date();
    
    if (user && new Date(user.paid_until) > new Date()) {
      // Extend existing subscription
      paidUntil = new Date(user.paid_until);
    }
    
    paidUntil.setMonth(paidUntil.getMonth() + 1); // +1 month

    // Update user
    db.prepare(`
      UPDATE users 
      SET paid_until = ?, 
          last_login = datetime("now"),
          is_blocked = 0,
          blocked_reason = NULL,
          failed_login_attempts = 0,
          payment_amount = ?,
          payment_currency = ?
      WHERE id = ?
    `).run(paidUntil.toISOString(), amount, 'KCY', userId);

    // Log payment
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    db.prepare(`
      INSERT INTO payment_logs (user_id, phone, amount, currency, stripe_payment_id, status, country_code, ip_address, payment_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      phone, 
      amount, 
      'KCY', 
      txHash, // Store tx hash in stripe_payment_id field
      'succeeded', 
      'CRYPTO', 
      clientIP,
      'crypto_payment'
    );

    // Create session token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, device_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, token, expiresAt.toISOString(), 'web');

    // Log crypto payment details
    console.log('✅ Crypto payment confirmed:', {
      userId,
      phone,
      txHash,
      walletAddress,
      amount,
      tokenAddress,
      paidUntil: paidUntil.toISOString()
    });

    res.json({
      success: true,
      token,
      paidUntil: paidUntil.toISOString(),
      unblocked: user.is_blocked ? true : false
    });
  } catch (err) {
    console.error('Crypto payment confirm error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get crypto payment status (for checking pending payments)
router.get('/crypto-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = db.prepare('SELECT paid_until FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPaid = new Date(user.paid_until) > new Date();
    
    res.json({
      isPaid,
      paidUntil: user.paid_until
    });
  } catch (err) {
    console.error('Crypto status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Manual crypto payment verification (admin can trigger)
router.post('/verify-crypto-payment', async (req, res) => {
  try {
    const { txHash, expectedAmount } = req.body;

    // TODO: Implement blockchain verification
    // This would use ethers.js or web3.js to:
    // 1. Get transaction details from BSC
    // 2. Verify it's to the correct treasury wallet
    // 3. Verify the amount is correct
    // 4. Verify it's a KCY1 token transfer
    
    // For now, return basic info
    res.json({
      verified: false,
      message: 'Blockchain verification not yet implemented',
      txHash
    });
  } catch (err) {
    console.error('Verify crypto error:', err);
    res.status(500).json({ error: err.message });
  }
});
