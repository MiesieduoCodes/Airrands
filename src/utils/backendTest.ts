import { 
  addProduct, 
  getProducts, 
  updateProduct, 
  deleteProduct,
  getProfile,
  updateSellerProfile,
  getOrders,
  getChats,
  uploadProductImages
} from '../services/sellerServices';
import { Alert } from 'react-native';

export const testBackendIntegration = async (sellerId: string) => {
  try {
    // Test 1: Profile Management
    const profile = await getProfile(sellerId);
    // Test 2: Product Management
    const testProduct = {
      name: 'Test Product',
      price: 1000,
      description: 'This is a test product for backend integration testing',
      categoryId: 'food',
      available: true,
      stockLevel: 10,
      lowStockThreshold: 5,
      images: [],
      variants: [],
      addOns: []
    };
    
    const productId = await addProduct(sellerId, testProduct);
    // Test 3: Get Products
    const products = await getProducts(sellerId);
    // Test 4: Update Product
    await updateProduct(sellerId, productId, { price: 1200 });
    // Test 5: Delete Product
    await deleteProduct(sellerId, productId);
    // Test 6: Orders
    const orders = await getOrders(sellerId);
    // Test 7: Chats
    const chats = await getChats(sellerId);
    Alert.alert('Backend Test', 'All backend integration tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Backend test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    Alert.alert('Backend Test Failed', `Error: ${errorMessage}`);
  }
};

export const testRealTimeUpdates = (sellerId: string) => {
  // This would be implemented in the actual screens
  // For now, we'll just log that the test is available
  };

export const testImageUpload = async (sellerId: string, imageUri: string) => {
  try {
    const imageUrl = await uploadProductImages(sellerId, imageUri);
    return imageUrl;
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    throw error;
  }
};

export const validateBackendConnection = async () => {
  try {
    // Test basic Firebase connection
    const { db } = await import('../config/firebase');
    const testDoc = await db.collection('test').doc('connection').get();
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
}; 