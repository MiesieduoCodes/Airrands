import { db } from '../config/firebase';
import firebase from 'firebase/compat/app';
import ratingService, { Rating } from './ratingService';

export interface ReviewTrigger {
  id?: string;
  userId: string;
  targetId: string;
  targetType: 'store' | 'runner';
  targetName: string;
  targetImage?: string;
  orderId?: string;
  errandId?: string;
  status: 'pending' | 'completed' | 'skipped';
  createdAt: any;
  completedAt?: any;
}

export interface ReviewPrompt {
  id: string;
  type: 'order' | 'errand';
  targetId: string;
  targetType: string;
  targetName: string;
  targetImage?: string;
  orderId?: string;
  errandId?: string;
  status: string;
  message: string;
  createdAt?: any;
}

class ReviewService {
  private collectionName = 'reviewTriggers';

  // Create a review trigger when an order is completed
  async createOrderReviewTrigger(
    buyerId: string,
    orderId: string,
    sellerId: string,
    sellerName: string,
    sellerImage?: string
  ): Promise<string> {
    try {
      const triggerData: Omit<ReviewTrigger, 'id' | 'createdAt'> = {
        userId: buyerId,
        targetId: sellerId,
        targetType: 'store',
        targetName: sellerName,
        targetImage: sellerImage,
        orderId,
        status: 'pending',
      };

      const docRef = await db.collection(this.collectionName).add({
        ...triggerData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Create notification for the buyer
      await db.collection('users').doc(buyerId).collection('notifications').add({
        title: 'Review Your Order',
        message: `How was your experience with ${sellerName}?`,
        type: 'review_prompt',
        status: 'unread',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        triggerId: docRef.id,
        targetId: sellerId,
        targetType: 'store',
        orderId,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating order review trigger:', error);
      throw error;
    }
  }

  // Create a review trigger when an errand is completed
  async createErrandReviewTrigger(
    buyerId: string,
    errandId: string,
    runnerId: string,
    runnerName: string,
    runnerImage?: string
  ): Promise<string> {
    try {
      const triggerData: Omit<ReviewTrigger, 'id' | 'createdAt'> = {
        userId: buyerId,
        targetId: runnerId,
        targetType: 'runner',
        targetName: runnerName,
        targetImage: runnerImage,
        errandId,
        status: 'pending',
      };

      const docRef = await db.collection(this.collectionName).add({
        ...triggerData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Create notification for the buyer
      await db.collection('users').doc(buyerId).collection('notifications').add({
        title: 'Review Your Errand',
        message: `How was your experience with ${runnerName}?`,
        type: 'review_prompt',
        status: 'unread',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        triggerId: docRef.id,
        targetId: runnerId,
        targetType: 'runner',
        errandId,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating errand review trigger:', error);
      throw error;
    }
  }

  // Get pending review prompts for a user
  async getPendingReviewPrompts(userId: string): Promise<ReviewPrompt[]> {
    try {
      // Get all review triggers for this user
      const triggersRef = db.collection('reviewTriggers');
      const triggersQuery = triggersRef.where('userId', '==', userId).where('status', '==', 'pending');
      const triggersSnap = await triggersQuery.get();
      
      if (triggersSnap.empty) {
        return [];
      }
      
      const pendingPrompts = triggersSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type as 'order' | 'errand',
          targetId: data.targetId,
          targetType: data.targetType,
          targetName: data.targetName,
          targetImage: data.targetImage,
          orderId: data.orderId,
          errandId: data.errandId,
          status: data.status,
          message: data.message,
          createdAt: data.createdAt,
        } as ReviewPrompt;
      });
      
      // Sort by creation time (newest first)
      pendingPrompts.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      return pendingPrompts;
    } catch (error) {
      console.error('Error getting pending review prompts:', error);
      return [];
    }
  }

  // Mark a review trigger as completed
  async markReviewCompleted(triggerId: string): Promise<void> {
    try {
      await db.collection(this.collectionName).doc(triggerId).update({
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking review as completed:', error);
      throw error;
    }
  }

  // Mark a review trigger as skipped
  async markReviewSkipped(triggerId: string): Promise<void> {
    try {
      await db.collection(this.collectionName).doc(triggerId).update({
        status: 'skipped',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking review as skipped:', error);
      throw error;
    }
  }

  // Check if user has already rated a target
  async hasUserRated(userId: string, targetId: string, targetType: 'product' | 'store' | 'runner'): Promise<boolean> {
    try {
      const ratingRef = db.collection('ratings');
      const ratingQuery = ratingRef
        .where('userId', '==', userId)
        .where('targetId', '==', targetId)
        .where('targetType', '==', targetType);
      
      const ratingSnap = await ratingQuery.get();
      return !ratingSnap.empty;
    } catch (error) {
      console.error('Error checking if user has rated:', error);
      return false;
    }
  }

  // Get user's rating for a target
  async getUserRating(userId: string, targetId: string, targetType: 'product' | 'store' | 'runner'): Promise<Rating | null> {
    try {
      const ratingRef = db.collection('ratings');
      const ratingQuery = ratingRef
        .where('userId', '==', userId)
        .where('targetId', '==', targetId)
        .where('targetType', '==', targetType);
      
      const ratingSnap = await ratingQuery.get();
      
      if (ratingSnap.empty) {
        return null;
      }
      
      const ratingDoc = ratingSnap.docs?.[0];
      return {
        id: ratingDoc.id,
        ...ratingDoc.data()
      } as Rating;
    } catch (error) {
      console.error('Error getting user rating:', error);
      return null;
    }
  }

  // Submit review and mark trigger as completed
  async submitReviewAndComplete(triggerId: string, ratingData: {
    userId: string;
    userName: string;
    userEmail: string;
    userImage?: string;
    targetId: string;
    targetType: 'product' | 'store' | 'runner';
    rating: number;
    review?: string;
    images?: string[];
  }): Promise<void> {
    try {
      // Submit the rating
      await ratingService.submitRating(ratingData);
      
      // Mark the review trigger as completed
      await this.markReviewCompleted(triggerId);
      
      } catch (error) {
      console.error('Error submitting review and completing trigger:', error);
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
export default reviewService; 