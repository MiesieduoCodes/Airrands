// Firebase Auth Error Code to User-Friendly Message Mapping
export const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    // Invalid credentials
    'auth/invalid-credential': 'Incorrect email or password. Please check your login details and try again.',
    'auth/user-not-found': 'No account found with this email address. Please check your email or create a new account.',
    'auth/wrong-password': 'Incorrect password. Please check your password and try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    
    // Account status
    'auth/user-disabled': 'This account has been disabled. Please contact support for assistance.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email address but with different sign-in credentials.',
    
    // Too many attempts
    'auth/too-many-requests': 'Too many failed login attempts. Please wait a few minutes before trying again.',
    
    // Network and server errors
    'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
    'auth/internal-error': 'Something went wrong on our end. Please try again in a moment.',
    'auth/service-unavailable': 'Authentication service is temporarily unavailable. Please try again later.',
    'auth/timeout': 'Request timed out. Please check your connection and try again.',
    
    // Email verification
    'auth/email-not-verified': 'Please verify your email address before signing in.',
    
    // Weak password (for registration)
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    
    // Email already in use (for registration)
    'auth/email-already-in-use': 'An account with this email address already exists. Please sign in instead.',
    
    // Invalid action code (for password reset)
    'auth/invalid-action-code': 'The password reset link is invalid or has expired. Please request a new one.',
    'auth/expired-action-code': 'The password reset link has expired. Please request a new one.',
    
    // Quota exceeded
    'auth/quota-exceeded': 'Too many requests. Please try again later.',
    
    // App verification
    'auth/app-not-authorized': 'This app is not authorized to use Firebase Authentication.',
    
    // Custom token errors
    'auth/custom-token-mismatch': 'Authentication error. Please try signing in again.',
    
    // Operation not allowed
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    
    // Requires recent login
    'auth/requires-recent-login': 'For security reasons, please sign in again to complete this action.',
    
    // Invalid verification code
    'auth/invalid-verification-code': 'Invalid verification code. Please check and try again.',
    'auth/invalid-verification-id': 'Invalid verification ID. Please try again.',
    
    // Phone number errors
    'auth/invalid-phone-number': 'Please enter a valid phone number.',
    'auth/missing-phone-number': 'Phone number is required.',
    
    // Multi-factor authentication
    'auth/multi-factor-auth-required': 'Additional authentication is required.',
    'auth/maximum-second-factor-count-exceeded': 'Maximum number of second factors exceeded.',
    
    // Tenant errors
    'auth/tenant-id-mismatch': 'Authentication configuration error. Please contact support.',
    
    // Unsupported tenant operation
    'auth/unsupported-tenant-operation': 'This operation is not supported. Please contact support.',
    
    // Invalid tenant ID
    'auth/invalid-tenant-id': 'Authentication configuration error. Please contact support.',
    
    // Missing client identifier
    'auth/missing-client-identifier': 'Authentication configuration error. Please contact support.',
    
    // Invalid client ID
    'auth/invalid-client-id': 'Authentication configuration error. Please contact support.',
    
    // Invalid continue URI
    'auth/invalid-continue-uri': 'Invalid redirect URL. Please contact support.',
    
    // Missing continue URI
    'auth/missing-continue-uri': 'Missing redirect URL. Please contact support.',
    
    // Unauthorized continue URI
    'auth/unauthorized-continue-uri': 'Unauthorized redirect URL. Please contact support.',
  };

  // Return user-friendly message or a generic fallback
  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again or contact support if the problem persists.';
};

// Helper function to extract error code from Firebase error
export const extractFirebaseErrorCode = (error: any): string => {
  // Handle Firebase error objects
  if (error?.code) {
    return error.code;
  }
  
  // Handle error messages that contain the code
  if (error?.message && typeof error.message === 'string') {
    // Extract code from message like "Firebase: Error message (auth/error-code)."
    const codeMatch = error.message.match(/\(([^)]+)\)/);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1];
    }
  }
  
  // Fallback for unknown error format
  return 'auth/unknown-error';
};

// Main function to get user-friendly error message from any Firebase auth error
export const getFirebaseAuthErrorMessage = (error: any): string => {
  const errorCode = extractFirebaseErrorCode(error);
  return getAuthErrorMessage(errorCode);
};
