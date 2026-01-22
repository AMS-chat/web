// Version: 001.00001
// crypto-payment-listener.js
// Automatic listener for KCY1 token transfers to treasury wallet

const { ethers } = require('ethers');

// Configuration
const KCY1_TOKEN_ADDRESS = 'YOUR_KCY1_TOKEN_ADDRESS'; // Replace with actual address
const TREASURY_WALLET = '0x58ec63d31b8e4D6624B5c88338027a54Be1AE28A';
const BSC_RPC_URL = 'https://bsc-dataseed.binance.org/';
const REQUIRED_AMOUNT = '300'; // 300 KCY tokens

// ERC20 Transfer event ABI
const TRANSFER_EVENT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// Token ABI for reading details
const TOKEN_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)"
];

class CryptoPaymentListener {
  constructor(db) {
    this.db = db;
    this.provider = new ethers.providers.JsonRpcProvider(BSC_RPC_URL);
    this.tokenContract = new ethers.Contract(KCY1_TOKEN_ADDRESS, TOKEN_ABI, this.provider);
    this.isListening = false;
  }

  async start() {
    try {
      console.log('🎧 Starting crypto payment listener...');
      
      // Get token info
      const decimals = await this.tokenContract.decimals();
      const symbol = await this.tokenContract.symbol();
      
      console.log(`📡 Listening for ${symbol} transfers to ${TREASURY_WALLET}`);
      console.log(`💰 Required amount: ${REQUIRED_AMOUNT} ${symbol}`);

      // Listen for Transfer events
      const filter = {
        address: KCY1_TOKEN_ADDRESS,
        topics: [
          ethers.utils.id("Transfer(address,address,uint256)"),
          null, // from (any)
          ethers.utils.hexZeroPad(TREASURY_WALLET.toLowerCase(), 32) // to (treasury)
        ]
      };

      this.provider.on(filter, async (log) => {
        await this.handleTransfer(log, decimals, symbol);
      });

      this.isListening = true;
      console.log('✅ Crypto payment listener started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start crypto payment listener:', error);
      throw error;
    }
  }

  async handleTransfer(log, decimals, symbol) {
    try {
      console.log('📥 New transfer detected!');
      
      // Parse the log
      const iface = new ethers.utils.Interface(TRANSFER_EVENT_ABI);
      const parsed = iface.parseLog(log);
      
      const from = parsed.args.from;
      const to = parsed.args.to;
      const value = parsed.args.value;
      
      // Get transaction hash
      const txHash = log.transactionHash;
      
      // Format amount
      const amount = ethers.utils.formatUnits(value, decimals);
      const amountFloat = parseFloat(amount);
      
      console.log('💳 Transfer details:', {
        from,
        to,
        amount: `${amount} ${symbol}`,
        txHash,
        blockNumber: log.blockNumber
      });

      // Check if amount is sufficient
      const requiredAmount = parseFloat(REQUIRED_AMOUNT);
      
      if (amountFloat < requiredAmount) {
        console.log(`⚠️ Amount too low: ${amountFloat} < ${requiredAmount}`);
        return;
      }

      // Check if payment already processed
      const existing = this.db.prepare(
        'SELECT * FROM payment_logs WHERE stripe_payment_id = ?'
      ).get(txHash);

      if (existing) {
        console.log('⚠️ Payment already processed, skipping');
        return;
      }

      // Try to find user by wallet address or pending payment
      // This is tricky - we need a way to link wallet to user
      // Option 1: User provides wallet during registration
      // Option 2: User clicks "pay" which creates a pending payment record
      
      // For now, we'll just log the payment and require manual confirmation
      console.log('🔍 Looking for pending payment for wallet:', from);
      
      // Log the incoming payment
      this.db.prepare(`
        INSERT INTO payment_logs (user_id, phone, amount, currency, stripe_payment_id, status, country_code, payment_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        0, // No user yet
        from.toLowerCase(), // Store wallet in phone field temporarily
        amountFloat,
        'KCY',
        txHash,
        'pending_confirmation', // Needs manual linking to user
        'CRYPTO',
        'crypto_incoming'
      );

      console.log('✅ Payment logged, awaiting user confirmation');
      
      // TODO: Implement webhook or notification to user
      // Could send to a queue for processing
      
    } catch (error) {
      console.error('❌ Error handling transfer:', error);
    }
  }

  async stop() {
    if (this.isListening) {
      this.provider.removeAllListeners();
      this.isListening = false;
      console.log('🛑 Crypto payment listener stopped');
    }
  }

  async getBalance() {
    try {
      const balance = await this.tokenContract.balanceOf(TREASURY_WALLET);
      const decimals = await this.tokenContract.decimals();
      const symbol = await this.tokenContract.symbol();
      
      const formatted = ethers.utils.formatUnits(balance, decimals);
      
      return {
        balance: formatted,
        symbol,
        raw: balance.toString()
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      return null;
    }
  }
}

// Export for use in server.js
module.exports = CryptoPaymentListener;

// Example usage in server.js:
/*
const CryptoPaymentListener = require('./crypto-payment-listener');

// After db initialization:
const cryptoListener = new CryptoPaymentListener(db);
cryptoListener.start().catch(console.error);

// Graceful shutdown:
process.on('SIGTERM', async () => {
  await cryptoListener.stop();
  process.exit(0);
});
*/
