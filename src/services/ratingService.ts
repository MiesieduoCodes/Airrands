import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  deleteDoc,
  getDoc,
  serverTimestamp,
  increment as firestoreIncrement
} from 'firebase/firestore';

export interface Rating {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string;
  targetId: string; // productId, sellerId, or runnerId
  targetType: 'product' | 'store' | 'runner';
  rating: number; // 1-5
  review?: string;
  images?: string[];
  createdAt: any;
  updatedAt?: any;
  helpful: number;
  reported: boolean;
  status: 'active' | 'hidden' | 'reported';
}

export interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentReviews: Rating[];
}

export interface RatingFilters {
  rating?: number;
  sortBy?: 'newest' | 'oldest' | 'rating' | 'helpful';
  limit?: number;
}

class RatingService {
  private collectionName = 'ratings';

  // Submit a new rating and review
  async submitRating(ratingData: Omit<Rating, 'id' | 'createdAt' | 'helpful' | 'reported' | 'status'>): Promise<string> {
    try {
      const rating: Omit<Rating, 'id'> = {
        ...ratingData,
        helpful: 0,
        reported: false,
        status: 'active',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.collectionName), rating);
      
      // Update the target's average rating
      await this.updateTargetRating(ratingData.targetId, ratingData.targetType);
      
      return docRef.id;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw new Error('Failed to submit rating');
    }
  }

  // Get ratings for a specific target (product, store, or runner)
  async getRatings(
    targetId: string, 
    targetType: 'product' | 'store' | 'runner',
    filters: RatingFilters = {}
  ): Promise<Rating[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('targetId', '==', targetId),
        where('targetType', '==', targetType),
        where('status', '==', 'active')
      );

      // Apply rating filter
      if (filters.rating) {
        q = query(q, where('rating', '==', filters.rating));
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'newest':
          q = query(q, orderBy('createdAt', 'desc'));
          break;
        case 'oldest':
          q = query(q, orderBy('createdAt', 'asc'));
          break;
        case 'rating':
          q = query(q, orderBy('rating', 'desc'));
          break;
        case 'helpful':
          q = query(q, orderBy('helpful', 'desc'));
          break;
        default:
          q = query(q, orderBy('createdAt', 'desc'));
      }

      // Apply limit
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Rating[];
    } catch (error) {
      console.error('Error getting ratings:', error);
      throw new Error('Failed to get ratings');
    }
  }

  // Get rating summary for a target
  async getRatingSummary(targetId: string, targetType: 'product' | 'store' | 'runner'): Promise<RatingSummary> {
    try {
      const ratings = await this.getRatings(targetId, targetType);
      
      if (ratings.length === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          recentReviews: []
        };
      }

      // Calculate average rating
      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      const averageRating = totalRating / ratings.length;

      // Calculate rating distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach(rating => {
        if (distribution && rating.rating) {
          distribution[rating.rating as keyof typeof distribution]++;
        }
      });

      // Get recent reviews (last 5)
      const recentReviews = ratings
        .filter(rating => rating.review && rating.review.trim().length > 0)
        .slice(0, 5);

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalRatings: ratings.length,
        ratingDistribution: distribution,
        recentReviews
      };
    } catch (error) {
      console.error('Error getting rating summary:', error);
      throw new Error('Failed to get rating summary');
    }
  }

  // Update target's average rating in their document
  private async updateTargetRating(targetId: string, targetType: 'product' | 'store' | 'runner') {
    try {
      const summary = await this.getRatingSummary(targetId, targetType);
      
      let collectionName: string;
      switch (targetType) {
        case 'product':
          collectionName = 'products';
          break;
        case 'store':
          collectionName = 'users'; // Sellers are stored in users collection
          break;
        case 'runner':
          collectionName = 'users'; // Runners are stored in users collection
          break;
        default:
          return;
      }

      const targetRef = doc(db, collectionName, targetId);
      await updateDoc(targetRef, {
        rating: summary.averageRating,
        totalRatings: summary.totalRatings,
        lastRatingUpdate: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating target rating:', error);
    }
  }

  // Check if user has already rated this target
  async hasUserRated(userId: string, targetId: string, targetType: 'product' | 'store' | 'runner'): Promise<boolean> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('targetId', '==', targetId),
        where('targetType', '==', targetType)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking user rating:', error);
      return false;
    }
  }

  // Get user's rating for a specific target
  async getUserRating(userId: string, targetId: string, targetType: 'product' | 'store' | 'runner'): Promise<Rating | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('targetId', '==', targetId),
        where('targetType', '==', targetType)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs?.[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Rating;
    } catch (error) {
      console.error('Error getting user rating:', error);
      return null;
    }
  }

  // Update an existing rating
  async updateRating(ratingId: string, updates: Partial<Rating>): Promise<void> {
    try {
      const ratingRef = doc(db, this.collectionName, ratingId);
      await updateDoc(ratingRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Get the rating to update target's average
      const ratingDoc = await getDoc(ratingRef);
      if (ratingDoc.exists()) {
        const ratingData = ratingDoc.data() as Rating;
        await this.updateTargetRating(ratingData.targetId, ratingData.targetType);
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      throw new Error('Failed to update rating');
    }
  }

  // Delete a rating
  async deleteRating(ratingId: string): Promise<void> {
    try {
      // Get the rating before deleting to update target's average
      const ratingRef = doc(db, this.collectionName, ratingId);
      const ratingDoc = await getDoc(ratingRef);
      
      if (ratingDoc.exists()) {
        const ratingData = ratingDoc.data() as Rating;
        await deleteDoc(ratingRef);
        await this.updateTargetRating(ratingData.targetId, ratingData.targetType);
      }
    } catch (error) {
      console.error('Error deleting rating:', error);
      throw new Error('Failed to delete rating');
    }
  }

  // Mark a rating as helpful
  async markHelpful(ratingId: string): Promise<void> {
    try {
      const ratingRef = doc(db, this.collectionName, ratingId);
      await updateDoc(ratingRef, {
        helpful: firestoreIncrement(1)
      });
    } catch (error) {
      console.error('Error marking rating as helpful:', error);
      throw new Error('Failed to mark rating as helpful');
    }
  }

  // Report a rating
  async reportRating(ratingId: string, reason: string): Promise<void> {
    try {
      const ratingRef = doc(db, this.collectionName, ratingId);
      await updateDoc(ratingRef, {
        reported: true,
        reportReason: reason,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error reporting rating:', error);
      throw new Error('Failed to report rating');
    }
  }

  // Get reported ratings (for admin)
  async getReportedRatings(): Promise<Rating[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('reported', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Rating[];
    } catch (error) {
      console.error('Error getting reported ratings:', error);
      throw new Error('Failed to get reported ratings');
    }
  }

  // Admin: Hide/Unhide a rating
  async updateRatingStatus(ratingId: string, status: 'active' | 'hidden'): Promise<void> {
    try {
      const ratingRef = doc(db, this.collectionName, ratingId);
      await updateDoc(ratingRef, {
        status,
        updatedAt: serverTimestamp()
      });

      // Update target's average rating
      const ratingDoc = await getDoc(ratingRef);
      if (ratingDoc.exists()) {
        const ratingData = ratingDoc.data() as Rating;
        await this.updateTargetRating(ratingData.targetId, ratingData.targetType);
      }
    } catch (error) {
      console.error('Error updating rating status:', error);
      throw new Error('Failed to update rating status');
    }
  }
}

export default new RatingService(); 