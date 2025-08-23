import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type UserRole = 'buyer' | 'seller' | 'runner';

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type BuyerTabParamList = {
  Home: undefined;
  Search: undefined;
  Messages: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type SellerTabParamList = {
  Products: undefined;
  Messages: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type RunnerTabParamList = {
  Dashboard: undefined;
  Errands: { 
    filter?: string; 
    selectedErrandId?: string; 
    selectedOrderId?: string; 
  };
  Messages: { 
    selectedChatId?: string; 
  };
  Profile: undefined;
  Earnings: { 
    selectedPaymentId?: string; 
  };
  OrderTrackingScreen: { id: string; type: 'order' | 'errand'; role: 'runner' | 'seller' };
  RunnerTrackingScreen: { 
    jobId?: string; 
    jobType?: 'order' | 'errand'; 
    orderId?: string; 
    errandId?: string; 
  };
};

export type SharedStackParamList = {
  Chat: { 
    chatId: string; 
    chatName: string; 
    chatAvatar: string; 
    chatRole: 'seller' | 'runner';
  };
  OrderTracking: {
    jobType?: 'order' | 'errand';
    jobId?: string;
    orderId?: string;
    orderNumber: string;
    quantity?: number;
    productName?: string;
    totalAmount?: number;
  };
  Checkout: { 
    productId: string; 
    sellerId: string;
    productName: string;
    price: number;
    quantity?: number;
  };
  SellerProfile: { 
    sellerId: string; 
    sellerName: string;
  };
  RunnerProfile: { 
    runnerId: string; 
    runnerName: string;
  };
  ReviewSubmission: {
    targetId: string;
    targetType: 'product' | 'store' | 'runner';
    targetName: string;
    targetImage?: string;
    existingRating?: any;
  };
  Stores: undefined;
  Runners: undefined;
  HelpCenter: undefined;
  Feedback: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  DeactivateAccount: undefined;
  Verification: { 
    userRole: 'seller' | 'runner';
  };
  ProductDetail: {
    productId: string;
    sellerId: string;
    productName: string;
    price: number;
    description: string;
    image: string;
    rating?: number;
    reviews?: number;
    category?: string;
    deliveryTime?: string;
  };
};

export type RootStackParamList = {
  Auth: undefined;
  BuyerApp: undefined;
  SellerApp: undefined;
  RunnerApp: undefined;
  Chat: { 
    chatId: string; 
    chatName: string; 
    chatAvatar: string; 
    chatRole: 'seller' | 'runner';
  };
  OrderTracking: {
    jobType?: 'order' | 'errand';
    jobId?: string;
    orderId?: string;
    orderNumber: string;
    quantity?: number;
    productName?: string;
    totalAmount?: number;
  };
  RunnerTrackingScreen: { 
    jobId?: string; 
    jobType?: 'order' | 'errand'; 
    orderId?: string; 
    errandId?: string; 
  };
  Checkout: { 
    productId: string; 
    sellerId: string;
    productName: string;
    price: number;
    quantity?: number;
  };
  SellerProfile: { 
    sellerId: string; 
    sellerName: string;
  };
  RunnerProfile: { 
    runnerId: string; 
    runnerName: string;
  };
  Stores: undefined;
  Runners: undefined;
  ProductDetail: {
    productId: string;
    sellerId: string;
    productName: string;
    price: number;
    description: string;
    image: string;
    rating?: number;
    reviews?: number;
    category?: string;
    deliveryTime?: string;
  };
  ReviewSubmission: {
    targetId: string;
    targetType: 'product' | 'store' | 'runner';
    targetName: string;
    targetImage?: string;
    existingRating?: any;
  };
  HelpCenter: undefined;
  Feedback: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  DeactivateAccount: undefined;
  Verification: { 
    userRole: 'seller' | 'runner';
  };
  NotificationTester: undefined;
};

// Navigation prop types
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type BuyerNavigationProp = BottomTabNavigationProp<BuyerTabParamList> & {
  navigate: (screen: keyof BuyerTabParamList | 'Chat' | 'OrderTracking' | 'Checkout' | 'SellerProfile' | 'RunnerProfile' | 'Stores' | 'Runners' | 'HelpCenter' | 'Feedback' | 'TermsOfService' | 'PrivacyPolicy' | 'DeactivateAccount' | 'ProductDetail' | 'ReviewSubmission' | 'NotificationTester', params?: any) => void;
};
export type SellerNavigationProp = BottomTabNavigationProp<SellerTabParamList> & {
  navigate: (screen: keyof SellerTabParamList | 'Chat' | 'HelpCenter' | 'Feedback' | 'TermsOfService' | 'PrivacyPolicy' | 'DeactivateAccount' | 'ProductDetail' | 'Verification' | 'ReviewSubmission' | 'OrderTracking', params?: any) => void;
};
export type RunnerNavigationProp = BottomTabNavigationProp<RunnerTabParamList> & {
  navigate: (screen: keyof RunnerTabParamList | 'Chat' | 'HelpCenter' | 'Feedback' | 'TermsOfService' | 'PrivacyPolicy' | 'DeactivateAccount' | 'ProductDetail' | 'Verification' | 'ReviewSubmission' | 'RunnerTrackingScreen', params?: any) => void;
}; 

// Navigator component prop types
export type RunnerNavigatorProps = {
  navigation: RunnerNavigationProp;
};

export type SellerNavigatorProps = {
  navigation: SellerNavigationProp;
}; 

export type BuyerNavigatorProps = {
  navigation: BuyerNavigationProp;
}; 