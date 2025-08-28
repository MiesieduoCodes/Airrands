// Production Configuration
export const PRODUCTION_CONFIG = {
  // Socket.io Server URL - Your Railway domain
  SOCKET_URL: 'https://splendid-perception-production.up.railway.app',
  
  // API Endpoints
  API_BASE_URL: 'https://splendid-perception-production.up.railway.app/api',
  
  // Payment Configuration
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_your_production_paystack_public_key_here',
  
  // Google Maps API Key
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBchUZKKuN95XYo0M7q6KOsUEWJsA5KPLI',
  
  // Firebase Configuration
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyC8y7Nv-8355IEu7RhrWuhsyucZh6YyNc8",
    authDomain: "airands-apk.firebaseapp.com",
    databaseURL: "https://airands-apk-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "airands-apk",
    storageBucket: "airands-apk.firebasestorage.app",
    messagingSenderId: "973554900024",
    appId: "1:973554900024:web:0a2746c5599f45640f1acd",
    measurementId: "G-QJCXMG81J8"
  },
  
  // Feature Flags
  FEATURES: {
    REAL_TIME_TRACKING: true,
    PUSH_NOTIFICATIONS: true,
    PAYMENT_PROCESSING: true,
    LOCATION_SERVICES: true,
  },
  
  // App Settings
  APP_SETTINGS: {
    LOCATION_UPDATE_INTERVAL: 15000, // 15 seconds
    SOCKET_RECONNECTION_ATTEMPTS: 5,
    SOCKET_TIMEOUT: 10000,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  }
}; 