// PayStack Configuration
// For development/testing, use test keys. For production, use live keys.

export const PAYSTACK_CONFIG = {
  // Test keys for development - replace with your actual PayStack test keys
  PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_0123456789abcdef0123456789abcdef01234567',
  SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || 'sk_test_0123456789abcdef0123456789abcdef01234567',
};

// Export the public key for components
export const PAYSTACK_PUBLIC_KEY = PAYSTACK_CONFIG.PUBLIC_KEY;
