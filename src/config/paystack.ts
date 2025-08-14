// PayStack Configuration
// To switch to production: 
// 1. Replace the keys below with your production keys
// 2. Change CURRENT_ENV from 'TEST' to 'PRODUCTION'

export const PAYSTACK_CONFIG = {
  // Test Keys (Development) - Replace with your actual test keys
  TEST: {
    PUBLIC_KEY: 'pk_test_your_paystack_public_key_here',
    SECRET_KEY: 'sk_test_your_paystack_secret_key_here',
  },
  
  // Production Keys - Replace with your actual production keys from PayStack dashboard
  PRODUCTION: {
    PUBLIC_KEY: 'pk_live_your_production_key_here',
    SECRET_KEY: 'sk_live_your_production_secret_key_here',
  },
  
  // 🔥 CHANGE THIS TO 'PRODUCTION' WHEN READY TO LAUNCH 🔥
  CURRENT_ENV: 'TEST' as 'TEST' | 'PRODUCTION',
  
  // Helper function to get current keys
  getCurrentKeys() {
    return this[this.CURRENT_ENV];
  },
  
  // Helper function to get public key for components
  getPublicKey() {
    return this[this.CURRENT_ENV].PUBLIC_KEY;
  },
  
  // Helper function to get secret key for server
  getSecretKey() {
    return this[this.CURRENT_ENV].SECRET_KEY;
  }
};

// Export the public key for easy use in components
export const PAYSTACK_PUBLIC_KEY = PAYSTACK_CONFIG.getPublicKey();

// Quick production switch function
export const switchToProduction = () => {
  PAYSTACK_CONFIG.CURRENT_ENV = 'PRODUCTION';
  return PAYSTACK_CONFIG.getPublicKey();
};
