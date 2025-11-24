// ============================================
// 🌐 GLOBAL CONFIGURATION - WEB VERSION
// ============================================
// Промени само едно място и всичко се update-ва!

// ============================================
// 🪙 CRYPTO CONFIGURATION
// ============================================
const CRYPTO_CONFIG = {
  // ⚠️ IMPORTANT: Change this to your actual KCY1 token address!
  TOKEN_ADDRESS: '0xYOUR_KCY1_TOKEN_ADDRESS_HERE',
  
  // Treasury wallet (receives payments)
  TREASURY_WALLET: '0x58ec63d31b8e4D6624B5c88338027a54Be1AE28A',
  
  // Payment amount (300 KCY tokens = 1 month)
  PAYMENT_AMOUNT: '300',
  
  // Blockchain settings
  NETWORK: {
    CHAIN_ID: '0x38', // BSC Mainnet
    CHAIN_ID_DECIMAL: 56,
    CHAIN_NAME: 'BSC Mainnet',
    RPC_URL: 'https://bsc-dataseed.binance.org/',
    EXPLORER_URL: 'https://bscscan.com/',
    CURRENCY: {
      NAME: 'BNB',
      SYMBOL: 'BNB',
      DECIMALS: 18
    }
  },
  
  // Testnet settings (for development)
  TESTNET: {
    CHAIN_ID: '0x61', // BSC Testnet
    CHAIN_ID_DECIMAL: 97,
    CHAIN_NAME: 'BSC Testnet',
    RPC_URL: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    EXPLORER_URL: 'https://testnet.bscscan.com/',
    CURRENCY: {
      NAME: 'tBNB',
      SYMBOL: 'tBNB',
      DECIMALS: 18
    }
  },
  
  // Use testnet in development (set to false for production)
  USE_TESTNET: false,
};

// Helper to get current network config
const getCurrentNetwork = () => {
  return CRYPTO_CONFIG.USE_TESTNET ? CRYPTO_CONFIG.TESTNET : CRYPTO_CONFIG.NETWORK;
};

// Export for use in HTML files
if (typeof window !== 'undefined') {
  window.CRYPTO_CONFIG = CRYPTO_CONFIG;
  window.getCurrentNetwork = getCurrentNetwork;
}

// Export for use in Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CRYPTO_CONFIG,
    getCurrentNetwork,
  };
}
