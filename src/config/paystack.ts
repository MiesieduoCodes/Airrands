// PayStack Production Configuration

export const PAYSTACK_CONFIG = {
  PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_your_production_paystack_public_key_here',
  SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || 'sk_live_your_production_paystack_secret_key_here',
};

// Export the public key for components
export const PAYSTACK_PUBLIC_KEY = PAYSTACK_CONFIG.PUBLIC_KEY;
