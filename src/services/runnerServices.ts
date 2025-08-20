import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';
import * as Location from 'expo-location';

// Get runner profile - FIXED VERSION
export const getProfile = async (runnerId: string) => {
  try {
    const ref = db.collection('users').doc(runnerId);
    const doc = await ref.get();
    
    if (doc.exists) {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        // Ensure required fields exist
        name: data?.name || 'Runner',
        email: data?.email || '',
        phone: data?.phone || '',
        avatar: data?.avatar || 'https://picsum.photos/200',
        rating: data?.rating || 0,
        deliveries: data?.deliveries || 0,
        vehicle: data?.vehicle || 'Motorcycle',
        vehicleNumber: data?.vehicleNumber || '',
        status: data?.status || 'available',
        experience: data?.experience || '1 year',
        specialties: data?.specialties || ['Food Delivery', 'Grocery Delivery'],
        averageDeliveryTime: data?.averageDeliveryTime || '25 min',
        totalEarnings: data?.totalEarnings || 0,
        totalDeliveries: data?.totalDeliveries || 0,
        memberSince: data?.memberSince || new Date().toLocaleDateString(),
        verification: data?.verification || {
          ninNumber: '',
          ninImageUrl: '',
          vehicleImageUrl: '',
          licenseImageUrl: '',
          status: 'not_submitted',
        },
      };
    } else {
      // Return default profile if document doesn't exist
      return {
        id: runnerId,
        name: '',
        email: '',
        phone: '',
        avatar: 'https://picsum.photos/200',
        rating: 0,
        deliveries: 0,
        vehicle: '',
        vehicleNumber: '',
        status: 'available',
        experience: '1 year',
        specialties: ['Food Delivery', 'Grocery Delivery'],
        averageDeliveryTime: '25 min',
        totalEarnings: 0,
        totalDeliveries: 0,
        memberSince: new Date().toLocaleDateString(),
        role: 'runner',
        verification: {
          ninNumber: '',
          ninImageUrl: '',
          vehicleImageUrl: '',
          licenseImageUrl: '',
          status: 'not_submitted',
        },
      };
    }
  } catch (error) {
    console.error('Error fetching runner profile:', error);
    // Return default profile on error
    return {
      id: runnerId,
      name: 'Runner',
      email: '',
      phone: '',
      avatar: 'https://picsum.photos/200',
      rating: 0,
      deliveries: 0,
      vehicle: 'Motorcycle',
      vehicleNumber: '',
      status: 'available',
      experience: '1 year',
      specialties: ['Food Delivery', 'Grocery Delivery'],
      averageDeliveryTime: '25 min',
      totalEarnings: 0,
      totalDeliveries: 0,
      memberSince: new Date().toLocaleDateString(),
      role: 'runner',
      verification: {
        ninNumber: '',
        ninImageUrl: '',
        vehicleImageUrl: '',
        licenseImageUrl: '',
        status: 'not_submitted',
      },
    };
  }
};

// Update runner profile
export const updateRunnerProfile = async (runnerId: string, updates: any) => {
  const ref = db.collection('users').doc(runnerId);
  await ref.update(updates);
};

// Update runner verification field
export const updateVerification = async (runnerId: string, verification: any) => {
  const ref = db.collection('users').doc(runnerId);
  await ref.update({ verification });
};

// Get runner orders/errands
export const getErrands = async (runnerId: string) => {
  try {
    const ref = db.collection('errands').where('runnerId', '==', runnerId);
    const snap = await ref.get();
    return snap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching errands:', error);
    return [];
  }
};

// Update runner availability status
export const updateAvailability = async (runnerId: string, isAvailable: boolean) => {
  const ref = db.collection('users').doc(runnerId);
  await ref.update({
    status: isAvailable ? 'available' : 'offline',
    updatedAt: new Date().toISOString()
  });
};

export const updateErrandStatus = async (runnerId: string, errandId: string, status: string) => {
  try {
    // Update the errand status in the errands collection
    await db.collection('errands').doc(errandId).update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      ...(status === 'completed' && {
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    });

    // Update runner's current status
    const ref = db.collection('users').doc(runnerId);
    await ref.update({
      currentErrand: status === 'completed' ? null : errandId,
      status: status === 'completed' ? 'available' : 'busy',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // If errand is completed, trigger review prompt
    if (status === 'completed' || status === 'delivered') {
      try {
        const errandDoc = await db.collection('errands').doc(errandId).get();
        if (errandDoc.exists) {
          const errandData = errandDoc.data();
          const buyerId = errandData?.buyerId;
          let runnerNameToUse = errandData?.runnerName;
          let runnerImageToUse = errandData?.runnerImage;
          
          if (buyerId && runnerId) {
            if (!runnerNameToUse) {
              const runnerDoc = await db.collection('users').doc(runnerId).get();
              if (runnerDoc.exists) {
                const runnerData = runnerDoc.data();
                runnerNameToUse = runnerData?.name || runnerData?.displayName || 'Unknown Runner';
                runnerImageToUse = runnerData?.image || runnerData?.avatar;
              }
            }
            
            const { reviewService } = await import('./reviewService');
            await reviewService.createErrandReviewTrigger(
              buyerId,
              errandId,
              runnerId,
              runnerNameToUse,
              runnerImageToUse
            );
          }
        }
      } catch (error) {
        console.error('Error creating review trigger for completed errand:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating errand status:', error);
    return false;
  }
};

// Update runner's current location
export const updateRunnerLocation = async (runnerId: string, latitude: number, longitude: number) => {
  try {
    await db.collection('users').doc(runnerId).update({
      currentLocation: {
        latitude,
        longitude,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      },
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      isOnline: true,
    });
    } catch (error) {
    console.error('Error updating runner location:', error);
    throw error;
  }
};

// Start real-time location tracking for runner
export const startRunnerLocationTracking = async (runnerId: string) => {
  try {
    // Request location permissions
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Get initial location
    let location = await Location.getCurrentPositionAsync({});
    await updateRunnerLocation(runnerId, location.coords.latitude, location.coords.longitude);

    // Set up location watching
    const locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 15000, // Update every 15 seconds for runners (more frequent)
        distanceInterval: 5, // Update every 5 meters
      },
      async (location) => {
        await updateRunnerLocation(runnerId, location.coords.latitude, location.coords.longitude);
      }
    );

    return locationSubscription;
  } catch (error) {
    console.error('Error starting runner location tracking:', error);
    throw error;
  }
};

// Stop runner location tracking
export const stopRunnerLocationTracking = async (runnerId: string) => {
  try {
    await db.collection('users').doc(runnerId).update({
      isOnline: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    });
    } catch (error) {
    console.error('Error stopping runner location tracking:', error);
    throw error;
  }
};

// Get chats for a runner
export const getChats = async (runnerId: string) => {
  try {
    // Get chats where the runner is a participant
    const chatsRef = db.collection('chats').where('participants', 'array-contains', runnerId);
    const chatsSnap = await chatsRef.get();
    
    if (chatsSnap.empty) {
      return [];
    }
    
    const chats = await Promise.all(chatsSnap.docs.map(async (doc: any) => {
        const chatData = doc.data();
        const participants = chatData.participants || [];
        
        // Find the other participant (not the runner)
        const otherParticipantId = participants.find((p: string) => p !== runnerId);
        
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
        
        const unreadCount = chatData.lastMessage?.senderId === runnerId ? 0 : (chatData.unreadCount || 0);
          
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
    console.error('Error fetching runner chats:', error);
    return [];
  }
}; 

// Get comprehensive earnings data for a runner
export const getRunnerEarnings = async (runnerId: string) => {
  try {
    // Get all completed errands for the runner
    const errandsRef = db.collection('errands');
    const errandsQuery = errandsRef.where('runnerId', '==', runnerId).where('status', '==', 'completed');
    const errandsSnap = await errandsQuery.get();
    
    if (errandsSnap.empty) {
      return {
        totalEarnings: 0,
        todayEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        completedErrands: [],
        earningsBreakdown: {
          food: 0,
          grocery: 0,
          express: 0,
          package: 0,
          errand: 0,
        }
      };
    }
    
    const errands = errandsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    
    // Calculate total earnings
    const totalEarnings = errands.reduce((sum, errand) => sum + (errand.fee || errand.amount || 0), 0);
    
    // Calculate today's earnings
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEarnings = errands.filter(errand => {
      if (!errand.completedAt || !errand.completedAt.toDate) return false;
      const completedAt = errand.completedAt.toDate();
      return completedAt >= startOfDay;
    }).reduce((sum, errand) => sum + (errand.fee || errand.amount || 0), 0);
    
    // Calculate weekly earnings
    const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const weeklyEarnings = errands.filter(errand => {
      if (!errand.completedAt || !errand.completedAt.toDate) return false;
      const completedAt = errand.completedAt.toDate();
      return completedAt >= startOfWeek;
    }).reduce((sum, errand) => sum + (errand.fee || errand.amount || 0), 0);
    
    // Calculate monthly earnings
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyEarnings = errands.filter(errand => {
      if (!errand.completedAt || !errand.completedAt.toDate) return false;
      const completedAt = errand.completedAt.toDate();
      return completedAt >= startOfMonth;
    }).reduce((sum, errand) => sum + (errand.fee || errand.amount || 0), 0);
    
    // Calculate earnings breakdown by category
    const earningsBreakdown = {
      food: 0,
      grocery: 0,
      express: 0,
      package: 0,
      errand: 0,
    };
    
    errands.forEach(errand => {
      const category = errand.category?.toLowerCase() || 'errand';
      const amount = errand.fee || errand.amount || 0;
      
      if (category.includes('food')) earningsBreakdown.food += amount;
      else if (category.includes('grocery')) earningsBreakdown.grocery += amount;
      else if (category.includes('express')) earningsBreakdown.express += amount;
      else if (category.includes('package')) earningsBreakdown.package += amount;
      else earningsBreakdown.errand += amount;
    });
    
    return {
      totalEarnings,
      todayEarnings,
      weeklyEarnings,
      monthlyEarnings,
      completedErrands: errands,
      earningsBreakdown
    };
    
  } catch (error) {
    console.error('Error fetching runner earnings:', error);
    return {
      totalEarnings: 0,
      todayEarnings: 0,
      weeklyEarnings: 0,
      monthlyEarnings: 0,
      completedErrands: [],
      earningsBreakdown: {
        food: 0,
        grocery: 0,
        express: 0,
        package: 0,
        errand: 0,
      }
    };
  }
};

// Update runner's total earnings in their profile
export const updateRunnerEarnings = async (runnerId: string, newEarnings: number) => {
  try {
    const userRef = db.collection('users').doc(runnerId);
    await userRef.update({
      totalEarnings: firebase.firestore.FieldValue.increment(newEarnings),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    
    } catch (error) {
    console.error('Error updating runner earnings:', error);
    throw error;
  }
};

// Get real-time earnings updates
export const subscribeToRunnerEarnings = (runnerId: string, callback: (earnings: any) => void) => {
  try {
    const errandsRef = db.collection('errands');
    const errandsQuery = errandsRef.where('runnerId', '==', runnerId).where('status', '==', 'completed');
    
    return errandsQuery.onSnapshot(async (snapshot) => {
      const errands = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Calculate earnings in real-time
      const totalEarnings = errands.reduce((sum, errand) => sum + (errand.fee || errand.amount || 0), 0);
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEarnings = errands.filter(errand => {
        if (!errand.completedAt || !errand.completedAt.toDate) return false;
        const completedAt = errand.completedAt.toDate();
        return completedAt >= startOfDay;
      }).reduce((sum, errand) => sum + (errand.fee || errand.amount || 0), 0);
      
      const earningsData = {
        totalEarnings,
        todayEarnings,
        completedErrands: errands,
        lastUpdated: new Date()
      };
      
      callback(earningsData);
    });
    
  } catch (error) {
    console.error('Error subscribing to runner earnings:', error);
    return null;
  }
}; 

// Upload an image to Firebase Storage and return the download URL
export const uploadImageAsync = async (uri: string, path: string): Promise<string> => {
  if (!uri) return '';
  const response = await fetch(uri);
  const blob = await response.blob();
  const ref = firebase.storage().ref().child(path);
  await ref.put(blob);
  const downloadUrl = await ref.getDownloadURL();
  return downloadUrl;
}; 