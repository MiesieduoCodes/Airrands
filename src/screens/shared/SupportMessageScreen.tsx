import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
  SegmentedButtons,
  Chip,
} from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import * as Animatable from 'react-native-animatable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import supportService from '../../services/supportService';

// Function to determine user role
const getUserRole = async (userId: string): Promise<'buyer' | 'seller' | 'runner'> => {
  try {
    const { db } = await import('../../config/firebase');
    
    // Check if user is a runner
    const runnerDoc = await db.collection('runners').doc(userId).get();
    if (runnerDoc.exists) {
      return 'runner';
    }
    
    // Check if user is a seller
    const sellerDoc = await db.collection('sellers').doc(userId).get();
    if (sellerDoc.exists) {
      return 'seller';
    }
    
    // Default to buyer
    return 'buyer';
  } catch (error) {
    console.error('Error determining user role:', error);
    return 'buyer'; // Default fallback
  }
};

const SupportMessageScreen = ({ navigation }: any) => {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const { user } = useAuth();

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'billing', label: 'Billing' },
    { value: 'account', label: 'Account' },
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const handleSubmit = async () => {
    setError('');
    
    if (!message.trim()) {
      setError('Please provide your message');
      return;
    }

    if (!user) {
      setError('You must be logged in to send a support message');
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine user role based on current screen/context
      const userRole = await getUserRole(user.uid);
      
      await supportService.submitSupportMessage(
        user.uid,
        user.displayName || user.email || 'User',
        user.email || '',
        userRole,
        message.trim(),
        category as any,
        priority as any
      );

      Alert.alert(
        'Message Sent',
        'Your support message has been sent successfully. We will get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Error submitting support message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animatable.View animation="fadeInDown" duration={600}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="headset"
              size={32}
              color={theme.colors.primary}
            />
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
              Contact Support
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              We're here to help! Send us a message and we'll get back to you as soon as possible.
            </Text>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={200} duration={600}>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Message Details
              </Text>

              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={[styles.label, { color: theme.colors.onSurface }]}>
                  Category
                </Text>
                <SegmentedButtons
                  value={category}
                  onValueChange={setCategory}
                  buttons={categories.map(cat => ({
                    value: cat.value,
                    label: cat.label,
                    style: { backgroundColor: category === cat.value ? theme.colors.primary : 'transparent' }
                  }))}
                  style={styles.segmentedButtons}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={[styles.label, { color: theme.colors.onSurface }]}>
                  Priority
                </Text>
                <View style={styles.chipContainer}>
                  {priorities.map((pri) => (
                    <Chip
                      key={pri.value}
                      selected={priority === pri.value}
                      onPress={() => setPriority(pri.value)}
                      style={[
                        styles.chip,
                        priority === pri.value && { backgroundColor: theme.colors.primary }
                      ]}
                      textStyle={[
                        styles.chipText,
                        priority === pri.value && { color: theme.colors.onPrimary }
                      ]}
                    >
                      {pri.label}
                    </Chip>
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text variant="bodyMedium" style={[styles.label, { color: theme.colors.onSurface }]}>
                  Your Message *
                </Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={6}
                  placeholder="Describe your issue or question in detail..."
                  value={message}
                  onChangeText={setMessage}
                  style={[styles.textInput, { backgroundColor: theme.colors.surface }]}
                  contentStyle={[styles.textInputContent, { color: theme.colors.onSurface }]}
                  editable={!isSubmitting}
                />
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting || !message.trim()}
                  style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                  contentStyle={styles.buttonContent}
                  labelStyle={[styles.buttonLabel, { color: theme.colors.onPrimary }]}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={400} duration={600}>
          <Card style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <View style={styles.infoHeader}>
                <MaterialCommunityIcons
                  name="information"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text variant="titleSmall" style={[styles.infoTitle, { color: theme.colors.onSurfaceVariant }]}>
                  What to expect
                </Text>
              </View>
              <Text variant="bodySmall" style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                • We typically respond within 24 hours{'\n'}
                • For urgent issues, please select "Urgent" priority{'\n'}
                • Include as much detail as possible to help us assist you better{'\n'}
                • You can check the status of your messages in your profile
              </Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  card: {
    marginBottom: 20,
    elevation: 2,
  },
  cardContent: {
    padding: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
  },
  textInput: {
    marginTop: 8,
  },
  textInputContent: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 20,
  },
  submitButton: {
    borderRadius: 12,
    elevation: 2,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    elevation: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    lineHeight: 20,
  },
});

export default SupportMessageScreen;
