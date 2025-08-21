import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';

// Sample data for testing
const sampleStores = [
  {
    role: 'seller',
    name: 'Fresh Market',
    displayName: 'Fresh Market',
    businessName: 'Fresh Market Store',
    email: 'freshmarket@test.com',
    type: 'grocery',
    businessType: 'grocery',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    photoURL: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    avatar: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    latitude: 6.5244, // Lagos coordinates
    longitude: 3.3792,
    currentLocation: {
      latitude: 6.5244,
      longitude: 3.3792
    },
    isOnline: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  },
  {
    role: 'seller',
    name: 'Pizza Palace',
    displayName: 'Pizza Palace',
    businessName: 'Pizza Palace Restaurant',
    email: 'pizzapalace@test.com',
    type: 'restaurant',
    businessType: 'restaurant',
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    photoURL: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    avatar: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    latitude: 6.5344,
    longitude: 3.3892,
    currentLocation: {
      latitude: 6.5344,
      longitude: 3.3892
    },
    isOnline: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  },
  {
    role: 'seller',
    name: 'Tech Store',
    displayName: 'Tech Store',
    businessName: 'Tech Store Electronics',
    email: 'techstore@test.com',
    type: 'electronics',
    businessType: 'electronics',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    photoURL: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    avatar: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
    latitude: 6.5144,
    longitude: 3.3692,
    currentLocation: {
      latitude: 6.5144,
      longitude: 3.3692
    },
    isOnline: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  }
];

const sampleRunners = [
  {
    role: 'runner',
    name: 'John Doe',
    displayName: 'John Doe',
    email: 'john.runner@test.com',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    latitude: 6.5200,
    longitude: 3.3800,
    currentLocation: {
      latitude: 6.5200,
      longitude: 3.3800
    },
    status: 'available',
    availability: 'available',
    isOnline: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    vehicle: 'Motorcycle',
    experience: '3 years',
    deliveries: 245,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  },
  {
    role: 'runner',
    name: 'Sarah Johnson',
    displayName: 'Sarah Johnson',
    email: 'sarah.runner@test.com',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
    photoURL: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
    latitude: 6.5300,
    longitude: 3.3700,
    currentLocation: {
      latitude: 6.5300,
      longitude: 3.3700
    },
    status: 'available',
    availability: 'available',
    isOnline: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    vehicle: 'Bicycle',
    experience: '2 years',
    deliveries: 189,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  },
  {
    role: 'runner',
    name: 'Mike Wilson',
    displayName: 'Mike Wilson',
    email: 'mike.runner@test.com',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    latitude: 6.5100,
    longitude: 3.3900,
    currentLocation: {
      latitude: 6.5100,
      longitude: 3.3900
    },
    status: 'busy',
    availability: 'busy',
    isOnline: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    vehicle: 'Car',
    experience: '5 years',
    deliveries: 432,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  }
];

export const addSampleData = async () => {
  try {
    console.log('Adding sample stores...');
    
    // Add sample stores
    for (const store of sampleStores) {
      await db.collection('users').add(store);
      console.log('Added store:', store.name);
    }
    
    console.log('Adding sample runners...');
    
    // Add sample runners
    for (const runner of sampleRunners) {
      await db.collection('users').add(runner);
      console.log('Added runner:', runner.name);
    }
    
    console.log('Sample data added successfully!');
    return { success: true, message: 'Sample data added successfully!' };
  } catch (error) {
    console.error('Error adding sample data:', error);
    return { success: false, error };
  }
};

export const clearSampleData = async () => {
  try {
    console.log('Clearing sample data...');
    
    // Get all test users (stores and runners)
    const testEmails = [
      'freshmarket@test.com',
      'pizzapalace@test.com', 
      'techstore@test.com',
      'john.runner@test.com',
      'sarah.runner@test.com',
      'mike.runner@test.com'
    ];
    
    for (const email of testEmails) {
      const snapshot = await db.collection('users').where('email', '==', email).get();
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('Cleared data for:', email);
    }
    
    console.log('Sample data cleared successfully!');
    return { success: true, message: 'Sample data cleared successfully!' };
  } catch (error) {
    console.error('Error clearing sample data:', error);
    return { success: false, error };
  }
};

export const checkDataExists = async () => {
  try {
    const sellersSnapshot = await db.collection('users').where('role', '==', 'seller').limit(1).get();
    const runnersSnapshot = await db.collection('users').where('role', '==', 'runner').limit(1).get();
    
    return {
      hasStores: !sellersSnapshot.empty,
      hasRunners: !runnersSnapshot.empty,
      storesCount: sellersSnapshot.size,
      runnersCount: runnersSnapshot.size
    };
  } catch (error) {
    console.error('Error checking data:', error);
    return { hasStores: false, hasRunners: false, storesCount: 0, runnersCount: 0 };
  }
};
