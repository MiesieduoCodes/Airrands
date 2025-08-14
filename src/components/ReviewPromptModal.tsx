import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  IconButton,
} from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { reviewService, ReviewPrompt } from '../services/reviewService';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

interface ReviewPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onReviewSubmitted: (prompt: ReviewPrompt) => void;
}

const ReviewPromptModal: React.FC<ReviewPromptModalProps> = ({
  visible, onClose, onReviewSubmitted}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [pendingPrompts, setPendingPrompts] = useState<ReviewPrompt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user?.uid) {
      loadPendingPrompts();
    }
  }, [visible, user?.uid]);

  const loadPendingPrompts = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const prompts = await reviewService.getPendingReviewPrompts(user.uid);
      setPendingPrompts(prompts);
    } catch (error) {
      console.error('Error loading pending review prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewNow = (prompt: ReviewPrompt) => {
    onClose();
    // Navigate to review screen with prompt data
    // This will be handled by the parent component
    onReviewSubmitted(prompt);
  };

  const handleSkipReview = async (prompt: ReviewPrompt) => {
    try {
      await reviewService.markReviewSkipped(prompt.id);
      setPendingPrompts(prev => prev.filter(p => p.id !== prompt.id));
      
      if (pendingPrompts.length === 1) {
        onClose();
      }
    } catch (error) {
      console.error('Error skipping review:', error);
      Alert.alert('Error', 'Failed to skip review. Please try again.');
    }
  };

  const handleSkipAll = async () => {
    try {
      await Promise.all(
        pendingPrompts.map(prompt => reviewService.markReviewSkipped(prompt.id))
      );
      setPendingPrompts([]);
      onClose();
    } catch (error) {
      console.error('Error skipping all reviews:', error);
      Alert.alert('Error', 'Failed to skip reviews. Please try again.');
    }
  };

  if (!visible || pendingPrompts.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={SlideInUp.duration(300)}
          style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="star" size={24} color={theme.colors.primary} />
            <Text
              variant="titleLarge"
              style={[styles.headerTitle, { color: theme.colors.onSurface }]}
            >
              Review Your Experience
            </Text>
            <IconButton
              icon="close"
              onPress={onClose}
              iconColor={theme.colors.onSurfaceVariant}
              size={24}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text
              variant="bodyMedium"
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
            >
              Help others by sharing your experience with these services:
            </Text>

            {pendingPrompts.map((prompt, index) => (
              <Animated.View
                key={prompt.id}
                entering={FadeIn.delay(index * 100).duration(300)}
              >
                <Card style={[styles.promptCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Card.Content style={styles.promptContent}>
                    <View style={styles.promptHeader}>
                      {prompt.targetImage && (
                        <Image source={{ uri: prompt.targetImage }} style={styles.targetImage} />
                      )}
                      <View style={styles.promptInfo}>
                        <Text
                          variant="titleMedium"
                          style={[styles.targetName, { color: theme.colors.onSurface }]}
                        >
                          {prompt.targetName}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={[styles.targetType, { color: theme.colors.onSurfaceVariant }]}
                        >
                          {prompt.targetType === 'store' ? 'Store' : 'Runner'}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={[styles.orderInfo, { color: theme.colors.onSurfaceVariant }]}
                        >
                          {prompt.type === 'order' ? `Order #${prompt.orderId}` : `Errand #${prompt.errandId}`}
                        </Text>
                      </View>
                    </View>
                    
                    <Text
                      variant="bodyMedium"
                      style={[styles.promptMessage, { color: theme.colors.onSurface }]}
                    >
                      {prompt.message}
                    </Text>

                    <View style={styles.promptActions}>
                      <Button
                        mode="outlined"
                        onPress={() => handleSkipReview(prompt)}
                        style={styles.skipButton}
                        textColor={theme.colors.onSurfaceVariant}
                      >
                        Skip
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => handleReviewNow(prompt)}
                        style={styles.reviewButton}
                        buttonColor={theme.colors.primary}
                      >
                        Review Now
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              </Animated.View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleSkipAll}
              style={styles.skipAllButton}
              textColor={theme.colors.onSurfaceVariant}
            >
              Skip All Reviews
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    maxHeight: '70%',
  },
  description: {
    textAlign: 'center',
    marginBottom: 16,
  },
  promptCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  promptContent: {
    padding: 0,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  promptInfo: {
    flex: 1,
  },
  targetName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  targetType: {
    marginBottom: 2,
  },
  orderInfo: {
    fontStyle: 'italic',
  },
  promptMessage: {
    marginBottom: 12,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 8,
  },
  skipButton: {
    flex: 1,
  },
  reviewButton: {
    flex: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  skipAllButton: {
    width: '100%',
  },
});

export default ReviewPromptModal; 