export type UserRole = 'buyer' | 'seller' | 'runner';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  sellerId: string;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  runnerId?: string;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
  status: 'pending' | 'accepted' | 'in_progress' | 'delivered' | 'cancelled';
  totalAmount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Store {
  id: string;
  name: string;
  ownerId: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  operatingHours: {
    open: string;
    close: string;
  };
  rating: number;
} 