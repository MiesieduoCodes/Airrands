import { db, storage } from '../config/firebase';
import * as Location from 'expo-location';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Enhanced product management with better error handling and real-time updates
export const addProduct = async (sellerId: string, product: any) => {
  try {
    // Validate required fields
    if (!product.name || !product.price || !product.description) {
      throw new Error('Missing required product fields');
    }

    const productData = {
      ...product,
      sellerId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      available: product.available !== undefined ? product.available : true,
    };

    // Add to seller's subcollection
    const sellerProductRef = db.collection('sellers').doc(sellerId).collection('products');
    const sellerDoc = await sellerProductRef.add(productData);
    
    // Add to main products collection for buyers
    const mainProductRef = db.collection('products').doc(sellerDoc.id);
    await mainProductRef.set({ ...productData, id: sellerDoc.id });
    
    return sellerDoc.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to add product: ${errorMessage}`);
  }
};

// Update product with enhanced validation
export const updateProduct = async (sellerId: string, productId: string, updates: any) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Update in seller's subcollection
    const sellerProductRef = db.collection('sellers').doc(sellerId).collection('products').doc(productId);
    await sellerProductRef.update(updateData);
    
    // Update in main products collection
    const mainProductRef = db.collection('products').doc(productId);
    await mainProductRef.update(updateData);
    
    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to update product: ${errorMessage}`);
  }
};

// Delete product with cleanup
export const deleteProduct = async (sellerId: string, productId: string) => {
  try {
    // Delete from seller's subcollection
    const sellerProductRef = db.collection('sellers').doc(sellerId).collection('products').doc(productId);
    await sellerProductRef.delete();
    
    // Delete from main products collection
    const mainProductRef = db.collection('products').doc(productId);
    await mainProductRef.delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to delete product: ${errorMessage}`);
  }
};

// Get all products for a seller with real-time updates
export const getProducts = async (sellerId: string) => {
  try {
    const ref = db.collection('sellers').doc(sellerId).collection('products');
    const snap = await ref.get();
    const products = snap.docs.map((doc: any) => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

// Get a single product with enhanced error handling
export const getProduct = async (sellerId: string, productId: string) => {
  try {
    const ref = db.collection('sellers').doc(sellerId).collection('products').doc(productId);
    const doc = await ref.get();
    if (doc.exists) {
      const data = doc.data();
      if (data) {
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

// Enhanced image upload with progress tracking
export const uploadProductImages = async (sellerId: string, imageUri: string) => {
  try {
    const fileName = `products/${sellerId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const ref = storage.ref().child(fileName);
    
    // Upload with metadata
    await ref.put(blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        sellerId,
        uploadedAt: new Date().toISOString(),
      }
    });
    
    const url = await ref.getDownloadURL();
    return url;
  } catch (error) {
    console.error('Error uploading product image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to upload image: ${errorMessage}`);
  }
};

// Enhanced category management
export const getCategories = async () => {
  try {
    const globalRef = db.collection('categories');
    const globalSnap = await globalRef.get();
    if (globalSnap.docs.length > 0) {
      return globalSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    }
    
    // Default categories if none exist
    return [
      { id: 'food', name: 'Food & Beverages', icon: 'food', color: '#FF6B6B' },
      { id: 'groceries', name: 'Groceries', icon: 'basket', color: '#4ECDC4' },
      { id: 'electronics', name: 'Electronics', icon: 'laptop', color: '#45B7D1' },
      { id: 'fashion', name: 'Fashion & Beauty', icon: 'tshirt-crew', color: '#96CEB4' },
      { id: 'health', name: 'Health & Pharmacy', icon: 'medical-bag', color: '#FFEAA7' },
      { id: 'home', name: 'Home & Office', icon: 'home', color: '#DDA0DD' },
      { id: 'sports', name: 'Sports & Fitness', icon: 'dumbbell', color: '#98D8C8' },
      { id: 'books', name: 'Books & Stationery', icon: 'book', color: '#F7DC6F' },
      { id: 'toys', name: 'Toys & Games', icon: 'gamepad-variant', color: '#BB8FCE' },
      { id: 'automotive', name: 'Automotive', icon: 'car', color: '#85C1E9' },
      { id: 'other', name: 'Other', icon: 'dots-horizontal', color: '#AEB6BF' },
    ];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const addCategory = async (category: any) => {
  try {
    const ref = db.collection('categories');
    const doc = await ref.add({
      ...category,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return doc.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

// Enhanced seller profile management
export const getProfile = async (sellerId: string) => {
  try {
    // Try to get from users collection first
    let ref = db.collection('users').doc(sellerId);
    let doc = await ref.get();
    
    if (!doc.exists) {
      // Try sellers collection as fallback
      ref = db.collection('sellers').doc(sellerId);
      doc = await ref.get();
    }
    
    if (doc.exists) {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        // Ensure required fields exist
        name: data?.name || data?.businessName || data?.displayName || 'Business Name',
        email: data?.email || '',
        phone: data?.phone || '',
        avatar: data?.avatar || data?.photoURL || data?.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
        coverImage: data?.coverImage || data?.bannerImage || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        address: data?.address || 'Address not set',
        description: data?.description || 'No description available',
        rating: data?.rating || 0,
        reviews: data?.reviews || 0,
        totalSales: data?.totalSales || 0,
        isOpen: data?.isOpen || false,
        deliveryTime: data?.deliveryTime || '30-45 min',
        minimumOrder: data?.minimumOrder || 0,
        deliveryFee: data?.deliveryFee || 0,
        deliveryRadius: data?.deliveryRadius || 5,
        categories: data?.categories || [],
        memberSince: data?.memberSince || data?.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString(),
        verificationStatus: data?.verificationStatus || 'not_submitted',
        isOnline: data?.isOnline || false,
        lastSeen: data?.lastSeen?.toDate?.() || new Date(),
      };
    } else {
      // Return default profile if document doesn't exist
      return {
        id: sellerId,
        name: 'Business Name',
        email: '',
        phone: '',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
        coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        address: 'Address not set',
        description: 'No description available',
        rating: 0,
        reviews: 0,
        totalSales: 0,
        isOpen: false,
        deliveryTime: '30-45 min',
        minimumOrder: 0,
        deliveryFee: 0,
        deliveryRadius: 5,
        categories: [],
        memberSince: new Date().toLocaleDateString(),
        role: 'seller',
        verificationStatus: 'not_submitted',
        isOnline: false,
        lastSeen: new Date(),
      };
    }
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    // Return default profile on error
    return {
      id: sellerId,
      name: 'Business Name',
      email: '',
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
      coverImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
      address: 'Address not set',
      description: 'No description available',
      rating: 0,
      reviews: 0,
      totalSales: 0,
      isOpen: false,
      deliveryTime: '30-45 min',
      minimumOrder: 0,
      deliveryFee: 0,
      deliveryRadius: 5,
      categories: [],
      memberSince: new Date().toLocaleDateString(),
      role: 'seller',
      verificationStatus: 'not_submitted',
      isOnline: false,
      lastSeen: new Date(),
    };
  }
};

// Enhanced profile update with validation
export const updateSellerProfile = async (sellerId: string, updates: any) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Update in users collection
    const userRef = db.collection('users').doc(sellerId);
    await userRef.update(updateData);
    
    // Also update in sellers collection for consistency
    const sellerRef = db.collection('sellers').doc(sellerId);
    await sellerRef.set(updateData, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error updating seller profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to update profile: ${errorMessage}`);
  }
};

// Enhanced image upload helper
export const uploadImage = async (uri: string, path: string) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ref = storage.ref().child(path);
    await ref.put(blob, {
      contentType: 'image/jpeg',
    });
    return await ref.getDownloadURL();
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Enhanced profile picture upload
export const uploadProfilePicture = async (sellerId: string, imageUri: string) => {
  try {
    const fileName = `profiles/${sellerId}/profile_${Date.now()}.jpg`;
    const url = await uploadImage(imageUri, fileName);
    
    // Update seller profile with new picture URL
    await db.collection('users').doc(sellerId).update({
      avatar: url,
      photoURL: url,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    
    // Also update in sellers collection
    await db.collection('sellers').doc(sellerId).set({
      avatar: url,
      photoURL: url,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    return url;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to upload profile picture: ${errorMessage}`);
  }
};

// Enhanced orders management
export const getOrders = async (sellerId: string) => {
  try {
    const ref = db.collection('orders').where('sellerId', '==', sellerId);
    const snap = await ref.get();
    
    const orders = snap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        // Ensure customer data exists
        customer: data.customer || {
          name: 'Unknown Customer',
          phone: '',
          address: '',
        },
        // Ensure items array exists
        items: data.items || [],
        // Ensure total exists
        total: data.total || 0,
        // Ensure status exists
        status: data.status || 'pending',
      };
    });
    
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

// Enhanced order status update
export const updateOrderStatus = async (sellerId: string, orderId: string, status: string) => {
  try {
    const ref = db.collection('orders').doc(orderId);
    await ref.update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: sellerId,
    });
    
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to update order status: ${errorMessage}`);
  }
};

// Enhanced chat management
export const getChats = async (sellerId: string) => {
  try {
    // Get chats where the seller is a participant
    const chatsRef = db.collection('chats').where('participants', 'array-contains', sellerId);
    const chatsSnap = await chatsRef.get();
    
    if (chatsSnap.empty) {
      return [];
    }
    
    const chats = await Promise.all(
      chatsSnap.docs.map(async (doc: any) => {
        const chatData = doc.data();
        const participants = chatData.participants || [];
        
        // Find the other participant (not the seller)
        const otherParticipantId = participants.find((p: string) => p !== sellerId);
        
        if (!otherParticipantId) {
          return null;
        }
        
        // Get the other participant's details
        let participantDetails = null;
        try {
          const userRef = db.collection('users').doc(otherParticipantId);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            participantDetails = {
              name: userData?.name || userData?.displayName || userData?.businessName || 'Unknown User',
              avatar: userData?.image || userData?.photoURL || userData?.avatar || 'https://i.imgur.com/T3zF9bJ.png',
              role: userData?.role || 'user',
            };
          }
        } catch (error) {
          console.error('Error fetching participant details:', error);
          participantDetails = {
            name: 'Unknown User',
            avatar: 'https://i.imgur.com/T3zF9bJ.png',
            role: 'user',
          };
        }
        
        const unreadCount = chatData.lastMessage?.senderId === sellerId ? 0 : (chatData.unreadCount || 0);
        
        return {
          id: doc.id,
          name: participantDetails?.name || 'Unknown User',
          avatar: participantDetails?.avatar || 'https://i.imgur.com/T3zF9bJ.png',
          role: participantDetails?.role || 'user',
          lastMessage: chatData.lastMessage?.content || 'No messages yet',
          timestamp: chatData.lastMessageTime?.toDate?.()?.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) || 'Now',
          unread: unreadCount,
          online: false, 
          participantId: otherParticipantId, // Add the other participant's ID
        };
      })
    );
    
    // Filter out null chats and sort by last message time
    const validChats = chats.filter(chat => chat !== null).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
    
    return validChats;
    
  } catch (error) {
    console.error('Error fetching seller chats:', error);
    return [];
  }
};

// Enhanced location tracking
export const updateSellerLocation = async (sellerId: string, latitude: number, longitude: number) => {
  try {
    await db.collection('users').doc(sellerId).update({
      currentLocation: {
        latitude,
        longitude,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      },
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      isOnline: true,
    });
    
    // Also update in sellers collection
    await db.collection('sellers').doc(sellerId).set({
      currentLocation: {
        latitude,
        longitude,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      },
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      isOnline: true,
    }, { merge: true });
    
    } catch (error) {
    console.error('Error updating seller location:', error);
    throw error;
  }
};

// Enhanced location tracking start
export const startLocationTracking = async (sellerId: string) => {
  try {
    // Request location permissions
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Get initial location
    let location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    await updateSellerLocation(sellerId, location.coords.latitude, location.coords.longitude);

    // Set up location watching
    const locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 10, // Update every 10 meters
      },
      async (location) => {
        await updateSellerLocation(sellerId, location.coords.latitude, location.coords.longitude);
      }
    );

    return locationSubscription;
  } catch (error) {
    console.error('Error starting location tracking:', error);
    throw error;
  }
};

// Enhanced location tracking stop
export const stopLocationTracking = async (sellerId: string) => {
  try {
    await db.collection('users').doc(sellerId).update({
      isOnline: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    });
    
    // Also update in sellers collection
    await db.collection('sellers').doc(sellerId).set({
      isOnline: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    } catch (error) {
    console.error('Error stopping location tracking:', error);
    throw error;
  }
};

// New: Real-time product updates listener
export const subscribeToProductUpdates = (sellerId: string, callback: (products: any[]) => void) => {
  const ref = db.collection('sellers').doc(sellerId).collection('products');
  return ref.onSnapshot((snapshot) => {
    const products = snapshot.docs.map((doc: any) => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
    callback(products);
  });
};

// New: Real-time order updates listener
export const subscribeToOrderUpdates = (sellerId: string, callback: (orders: any[]) => void) => {
  const ref = db.collection('orders').where('sellerId', '==', sellerId);
  return ref.onSnapshot((snapshot) => {
    const orders = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        customer: data.customer || { name: 'Unknown Customer', phone: '', address: '' },
        items: data.items || [],
        total: data.total || 0,
        status: data.status || 'pending',
      };
    });
    callback(orders);
  });
};

// New: Real-time chat updates listener
export const subscribeToChatUpdates = (sellerId: string, callback: (chats: any[]) => void) => {
  const ref = db.collection('chats').where('participants', 'array-contains', sellerId);
  return ref.onSnapshot(async (snapshot) => {
    const chats = await Promise.all(
      snapshot.docs.map(async (doc: any) => {
        const chatData = doc.data();
        const participants = chatData.participants || [];
        const otherParticipantId = participants.find((p: string) => p !== sellerId);
        
        if (!otherParticipantId) return null;
        
        try {
          const userRef = db.collection('users').doc(otherParticipantId);
          const userDoc = await userRef.get();
          const userData = userDoc.data();
          
          return {
            id: doc.id,
            name: userData?.name || userData?.displayName || userData?.businessName || 'Unknown User',
            avatar: userData?.image || userData?.photoURL || userData?.avatar || 'https://i.imgur.com/T3zF9bJ.png',
            role: userData?.role || 'user',
            lastMessage: chatData.lastMessage?.content || 'No messages yet',
            timestamp: chatData.lastMessageTime?.toDate?.()?.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) || 'Now',
            unread: chatData.lastMessage?.senderId === sellerId ? 0 : (chatData.unreadCount || 0),
            online: false,
            isOnline: userData?.isOnline || false,
            participantId: otherParticipantId, // Add the other participant's ID
          };
        } catch (error) {
          console.error('Error fetching participant details:', error);
          return null;
        }
      })
    );
    
    const validChats = chats.filter(chat => chat !== null).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
    
    callback(validChats);
  });
}; 