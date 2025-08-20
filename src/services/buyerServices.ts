import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';

// Get all stores (sellers)
export const getStores = async () => {
  try {
    // First try to get sellers from users collection
    const sellersRef = db.collection('users').where('role', '==', 'seller');
    const sellersSnap = await sellersRef.get();
    
    if (sellersSnap.docs.length > 0) {
      return sellersSnap.docs.map((doc: any) => {
        const data = doc.data();
        const latitude = data.currentLocation?.latitude || data.latitude;
        const longitude = data.currentLocation?.longitude || data.longitude;
        
        // Only return stores with valid coordinates
        if (!latitude || !longitude) {
          return null;
        }
        
        return { 
          id: doc.id, 
          ...data,
          // Ensure required fields are present
          name: data.name || data.displayName || data.businessName || 'Unknown Store',
          image: data.image || data.photoURL || data.avatar || 'https://i.imgur.com/T3zF9bJ.png',
          rating: data.rating || 4.0,
          distance: data.distance || 'Unknown',
          type: data.type || data.businessType || 'convenience',
          latitude,
          longitude,
        };
      }).filter(store => store !== null);
    }
    
    // If no sellers found, try the stores collection as fallback
    const storesRef = db.collection('stores');
    const storesSnap = await storesRef.get();
    
    if (storesSnap.docs.length > 0) {
      return storesSnap.docs.map((doc: any) => {
        const data = doc.data();
        const latitude = data.currentLocation?.latitude || data.latitude;
        const longitude = data.currentLocation?.longitude || data.longitude;
        
        // Only return stores with valid coordinates
        if (!latitude || !longitude) {
          return null;
        }
        
        return { 
          id: doc.id, 
          ...data,
          // Ensure required fields are present
          name: data.name || data.displayName || 'Unknown Store',
          image: data.image || data.photoURL || 'https://i.imgur.com/T3zF9bJ.png',
          rating: data.rating || 4.0,
          distance: data.distance || 'Unknown',
          type: data.type || 'convenience',
          latitude,
          longitude,
        };
      }).filter(store => store !== null);
    }
    
    // If no data found in either collection, return empty array
    return [];
  } catch (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
};

// Get all products
export const getProducts = async () => {
  try {
    // Get products from the main products collection with active status
    const ref = db.collection('products').where('status', '==', 'active');
    const snap = await ref.get();
    
    const products = await Promise.all(snap.docs.map(async (doc: any) => {
        const productData = { id: doc.id, ...doc.data() };
        
        // Get seller information for each product
        if (productData.sellerId) {
          try {
            const sellerRef = db.collection('users').doc(productData.sellerId);
            const sellerDoc = await sellerRef.get();
            if (sellerDoc.exists) {
              const sellerData = sellerDoc.data();
              productData.store = sellerData?.name || sellerData?.businessName || 'Unknown Store';
              productData.sellerName = sellerData?.name || sellerData?.businessName || 'Unknown Store';
            } else {
              productData.store = 'Unknown Store';
              productData.sellerName = 'Unknown Store';
            }
          } catch (error) {
            // Error fetching seller info for product
            productData.store = 'Unknown Store';
            productData.sellerName = 'Unknown Store';
          }
        }
        
        return productData;
      })
    );
    
    return products;
  } catch (error) {
    // Return empty array on error
    return [];
  }
};

// Get all runners
export const getRunners = async () => {
  try {
    const ref = db.collection('users').where('role', '==', 'runner');
    const snap = await ref.get();
    
    if (snap.docs.length > 0) {
      return snap.docs.map((doc: any) => {
        const data = doc.data();
        const latitude = data.currentLocation?.latitude || data.latitude;
        const longitude = data.currentLocation?.longitude || data.longitude;
        
        // Only return runners with valid coordinates
        if (!latitude || !longitude) {
          return null;
        }
        
        return { 
          id: doc.id, 
          ...data,
          // Ensure required fields are present
          name: data.name || data.displayName || 'Unknown Runner',
          image: data.image || data.photoURL || data.avatar || 'https://i.imgur.com/T3zF9bJ.png',
          rating: data.rating || data.averageRating || 0, // Show actual rating or 0 if none
          distance: data.distance || 'Unknown',
          status: data.status || 'available',
          latitude,
          longitude,
          // Additional fields for improved runner selection
          isOnline: data.isOnline || data.online || false,
          lastSeen: data.lastSeen || data.lastActive || data.updatedAt || null,
          currentDeliveryId: data.currentDeliveryId || data.activeDeliveryId || null,
          deliveries: data.deliveries || data.completedDeliveries || 0,
          availabilityStatus: data.availabilityStatus || 'available',
          // Runner-specific fields
          vehicleType: data.vehicleType || 'bike',
          vehicleNumber: data.vehicleNumber || null,
          phoneNumber: data.phoneNumber || data.phone || null,
          // Location tracking
          currentLocation: data.currentLocation || { latitude, longitude },
          // Performance metrics
          averageRating: data.averageRating || data.rating || 0,
          totalDeliveries: data.totalDeliveries || data.deliveries || 0,
          // Timestamps
          lastAssignedAt: data.lastAssignedAt || null,
          lastActiveAt: data.lastActiveAt || data.lastSeen || null,
        };
      }).filter(runner => runner !== null);
    }
    
    // If no runners found, return empty array
    return [];
  } catch (error) {
    return [];
  }
};

export const getRunnerAvailability = async () => {
  try {
    const snapshot = await db
      .collection('runners')
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      runnerId: doc.id,
      status: doc.data().status || 'available',
      lastSeen: doc.data().lastSeen,
      currentLocation: doc.data().currentLocation,
    }));
  } catch (error) {
    return [];
  }
};

export const requestRunner = async (buyerId: string, runnerId: string) => {
  try {
    const requestData = {
      buyerId,
      runnerId,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      type: 'runner_request',
    };

    const docRef = await db.collection('requests').add(requestData);
    
    // Also create a notification for the runner
    await db.collection('users').doc(runnerId).collection('notifications').add({
      title: 'New Runner Request',
      message: 'A buyer has requested your services',
      type: 'runner_request',
      status: 'unread',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      requestId: docRef.id,
      buyerId,
    });

    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Get orders for a buyer
export const getOrders = async (userId: string) => {
  const [buyer, seller, runner] = await Promise.all([
    db.collection('orders').where('userId', '==', userId).get(),
    db.collection('orders').where('sellerId', '==', userId).get(),
    db.collection('orders').where('runnerId', '==', userId).get()
  ]);

  const allOrders = [...buyer.docs, ...seller.docs, ...runner.docs]
    .map(doc => ({ id: doc.id, ...doc.data() }));
  
  return allOrders.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
};

// Update order status and tracking
export const updateOrderStatus = async (orderId: string, status: string, trackingUpdate?: any) => {
  try {
    const orderRef = db.collection('orders').doc(orderId);
    const updateData: any = { status, updatedAt: new Date() };
    if (trackingUpdate) {
      // Merge tracking update into the order's tracking field
      if (updateData && trackingUpdate.step) {
        updateData[`tracking.${trackingUpdate.step}`] = true;
      }
    }
    await orderRef.update(updateData);

    // If order is completed, trigger review prompt
    if (status === 'delivered' || status === 'completed') {
      try {
        // Get order details to find seller and buyer
        const orderDoc = await orderRef.get();
        if (orderDoc.exists) {
          const orderData = orderDoc.data();
          const buyerId = orderData?.userId;
          const sellerId = orderData?.sellerId;
          
          if (buyerId && sellerId) {
            // Get seller details
            const sellerDoc = await db.collection('users').doc(sellerId).get();
            if (sellerDoc.exists) {
              const sellerData = sellerDoc.data();
              const sellerName = sellerData?.name || sellerData?.businessName || 'Unknown Store';
              const sellerImage = sellerData?.image || sellerData?.avatar;

              // Import and use review service
              const { reviewService } = await import('./reviewService');
              await reviewService.createOrderReviewTrigger(
                buyerId,
                orderId,
                sellerId,
                sellerName,
                sellerImage
              );
            }
          }
        }
      } catch (error) {
        // Don't fail the order update if review trigger fails
      }
    }

    return true;
  } catch (error) {
    throw error;
  }
};

// Get chats for a buyer - Updated to use chatService for consistency
export const getChats = async (buyerId: string): Promise<any[]> => {
  try {
    // Use the chatService to get chats with proper participant details
    const { getUserChats } = await import('./chatService');
    
    return new Promise((resolve) => {
      const unsubscribe = getUserChats(buyerId, (chats) => {
        // Transform chat data to match the expected format in MessagesScreen
        const transformedChats = chats.map(chat => {
          const otherParticipant = chat.participants.find(p => p !== buyerId);
          const participantDetails = chat.participantDetails?.[otherParticipant || ''];
          
          // Only count unread messages that were not sent by the current user
          const unreadCount = chat.lastMessage?.senderId === buyerId ? 0 : (chat.unreadCount || 0);
          
          return {
            id: chat.id,
            name: participantDetails?.name || 'Unknown User',
            avatar: participantDetails?.avatar || 'https://i.imgur.com/T3zF9bJ.png',
            role: participantDetails?.role || 'user',
            lastMessage: chat.lastMessage?.content || 'No messages yet',
            timestamp: chat.lastMessageTime?.toDate?.()?.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) || 'Now',
            unread: unreadCount,
            online: false, 
            participantId: otherParticipant, // Add the other participant's ID
          };
        });
        
        unsubscribe();
        resolve(transformedChats);
      });
    });
  } catch (error) {
    return [];
  }
};

// Get buyer profile
export const getProfile = async (buyerId: string) => {
  const ref = db.collection('users').doc(buyerId);
  const doc = await ref.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// Update buyer profile
export const updateProfile = async (buyerId: string, updates: any) => {
  const ref = db.collection('users').doc(buyerId);
  await ref.update(updates);
};

// Get notifications for a buyer
export const getNotifications = async (buyerId: string) => {
  const ref = db.collection('notifications').where('userId', '==', buyerId);
  const snap = await ref.get();
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
};

// Additional functions for backward compatibility
export const getBuyerProfile = getProfile;
export const updateBuyerProfile = updateProfile;

// Get runner profile
export const getRunnerProfile = async (runnerId: string) => {
  const ref = db.collection('users').doc(runnerId);
  const doc = await ref.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// Get seller profile
export const getSellerProfile = async (sellerId: string) => {
  const ref = db.collection('users').doc(sellerId);
  const doc = await ref.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// Get seller products
export const getSellerProducts = async (sellerId: string) => {
  try {
    if (!sellerId) {
      return [];
    }

    // Get products from the main products collection filtered by sellerId
    const productsRef = db.collection('products').where('sellerId', '==', sellerId).where('status', '==', 'active');
    const productsSnap = await productsRef.get();
    
    if (productsSnap.empty) {
      return [];
    }
    
    const products = productsSnap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unnamed Product',
        price: data.price || 0,
        image: data.image || data.images?.[0] || 'https://i.imgur.com/T3zF9bJ.png',
        description: data.description || 'No description available',
        category: data.category || 'General',
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        sellerId: data.sellerId || sellerId,
        images: data.images || [],
        status: data.status || 'active',
        ...data
      };
    });

    return products;

  } catch (error) {
    console.error('Error fetching seller products:', error);
    // Return empty array on error instead of throwing
    return [];
  }
};

// Get buyer's errands
export const getErrands = async (buyerId: string) => {
  try {
    const errandsRef = db.collection('errands').where('buyerId', '==', buyerId);
    const errandsSnap = await errandsRef.get();
    
    return errandsSnap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        type: 'errand',
        status: data.status || 'pending',
        date: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'Unknown',
        total: data.amount || 0,
        store: data.runnerName || 'Runner',
        items: data.items || [],
        tracking: data.tracking || {},
        runner: data.runner ? {
          id: data.runner.id,
          name: data.runner.name,
          phone: data.runner.phone
        } : null
      };
    });
  } catch (error) {
    console.error('Error fetching errands:', error);
    return [];
  }
};

// Send an errand request from a buyer to a runner
export const requestErrand = async (runnerId: string, buyerId: string, data: any) => {
  try {
    await db.collection('errands').add({
      runnerId,
      buyerId,
      ...data,
      createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error sending errand request:', error);
    throw error;
  }
};

// Get store status for real-time availability
export const getStoreStatus = async () => {
  // Debug log
  try {
    const snapshot = await db
      .collection('stores')
      .where('isActive', '==', true)
      .get();

    const result = snapshot.docs.map(doc => ({
      storeId: doc.id,
      isOpen: doc.data().isOpen || true,
      lastUpdated: doc.data().lastUpdated,
      currentLocation: doc.data().currentLocation,
    }));
    
    // Debug log
    return result;
  } catch (error) {
    console.error('Error fetching store status:', error);
    return [];
  }
};

// Favorite store functions
export const favoriteStore = async (buyerId: string, storeId: string) => {
  try {
    await db.collection('users').doc(buyerId).collection('favorites').doc(storeId).set({
      storeId,
      addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      type: 'store'
    });
  } catch (error) {
    console.error('Error favoriting store:', error);
    throw error;
  }
};

export const unfavoriteStore = async (buyerId: string, storeId: string) => {
  try {
    await db.collection('users').doc(buyerId).collection('favorites').doc(storeId).delete();
  } catch (error) {
    console.error('Error unfavoriting store:', error);
    throw error;
  }
};

export const getFavoriteStores = async (buyerId: string) => {
  try {
    const snapshot = await db
      .collection('users')
      .doc(buyerId)
      .collection('favorites')
      .where('type', '==', 'store')
      .get();

    const favoriteIds = snapshot.docs.map(doc => doc.data().storeId);
    
    if (favoriteIds.length === 0) return [];

    const storesSnapshot = await db
      .collection('stores')
      .where(firebase.firestore.FieldValue.serverTimestamp(), 'in', favoriteIds)
      .get();

    return storesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isFavorite: true
    }));
  } catch (error) {
    console.error('Error fetching favorite stores:', error);
    return [];
  }
};