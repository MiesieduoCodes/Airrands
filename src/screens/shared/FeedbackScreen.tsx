import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
} from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import * as Animatable from 'react-native-animatable';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FeedbackScreen = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { theme } = useTheme();

  const handleSubmit = async () => {
    setError('');
    
    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    if (!feedback.trim()) {
      setError('Please provide feedback');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    }
  };

  const handleResubmit = () => {
    setIsSubmitted(false);
    setRating(0);
    setFeedback('');
    setError('');
  };

  if (isSubmitted) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animatable.View animation="fadeInDown" duration={800}>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.cardContent}>
                <Animatable.View
                  animation="pulse"
                  iterationCount="infinite"
                  duration={2000}
                  style={styles.iconContainer}
                >
                  <Text style={[styles.icon, { color: theme.colors.primary }]}>
                    ✅
                  </Text>
                </Animatable.View>
                
                <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Thank You!
          </Text>
                
                <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Your feedback has been submitted successfully. We appreciate your input and will use it to improve our service.
          </Text>
                
                <View style={styles.buttonContainer}>
            <Button
              mode="contained"
                    onPress={handleResubmit}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
                    Submit Another
            </Button>
                </View>
              </Card.Content>
            </Card>
          </Animatable.View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (<KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View animation="fadeInDown" duration={800}>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                Share Your Feedback
          </Text>
              
              <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                Help us improve by sharing your experience with Airrands.
                  </Text>
              
              <View style={styles.ratingContainer}>
                <Text variant="titleMedium" style={[styles.ratingLabel, { color: theme.colors.onSurface }]}>
                  Rate your experience
          </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (<Button
                key={star}
                      onPress={() => setRating(star)}
                      style={{ marginHorizontal: 2, minWidth: 0, paddingHorizontal: 0 }}
                      compact
                    >
                      <Text>
                        <MaterialCommunityIcons
                          name={rating >= star ? 'star' : 'star-outline'}
                  size={32}
                          color={theme.colors.primary}
                        />
          </Text>
                    </Button>
            ))}
          </View>
        </View>

          <TextInput
                label="Your Feedback"
                value={feedback}
                onChangeText={setFeedback}
            mode="outlined"
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
            multiline
            numberOfLines={6}
                placeholder="Tell us about your experience..."
                error={!!error}
            theme={{
              colors: {
                    primary: theme.colors.primary,
                    placeholder: theme.colors.onSurfaceVariant,
                    error: theme.colors.error,
              }
            }}
          />
              
              {error ? (
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
              ) : null}
              
              <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Submit Feedback
        </Button>
              </View>
            </Card.Content>
          </Card>
      </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardContent: {
    padding: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 28,
  },
  subtitle: {
    opacity: 0.8,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    marginBottom: 16,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 0,
    marginTop: 8,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    width: '100%',
    borderRadius: 12,
    height: 52,
  },
  buttonContent: {
    height: '100%',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
});

export default FeedbackScreen;