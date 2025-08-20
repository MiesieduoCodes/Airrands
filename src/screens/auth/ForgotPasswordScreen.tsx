import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
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
import { AuthNavigationProp } from '../../navigation/types';
import * as Animatable from 'react-native-animatable';
import { auth } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

interface ForgotPasswordScreenProps {
  navigation: AuthNavigationProp;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { theme } = useTheme();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      await auth.sendPasswordResetEmail(email);
      setIsSubmitted(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setIsSubmitted(false);
    setEmail('');
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
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                  Check Your Email
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                  We've sent a password reset link to:
                </Text>
                <Text style={[styles.email, { color: theme.colors.primary }]}>
                  {email}
                </Text>
                <Text style={[styles.instruction, { color: theme.colors.onSurfaceVariant }]}>
                Please note that the link will expire in 1 hour. If you don't see the email in your inbox, be sure to check your Spam Folder.
                </Text>
                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleResend}
                    style={styles.button}
                  >
                    Resend Email
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Animatable.View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animatable.View animation="fadeInDown" duration={800}>
          <Image
            source={require('../../../assets/Forgot password-cuate.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </Animatable.View>
        
        <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Forgot Password?
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
          </Animatable.View>
          
          <Animatable.View animation="fadeInUp" duration={800} delay={400}>
              <TextInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
              <HelperText type="error" visible={!!error} style={styles.errorText}>
                  {error}
                </HelperText>
              ) : null}
          </Animatable.View>
          
          <Animatable.View animation="fadeInUp" duration={800} delay={600}>
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading}
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                >
                  Send Reset Link
                </Button>
              </View>
        </Animatable.View>
        </View>
      </View>
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardContent: {
    padding: 32,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 28,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
    marginBottom: 32,
  },
  input: {
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    width: '100%',
    justifyContent: 'center',
    borderRadius: 12,
    height: 50,
    elevation: 0,
    marginTop: 8,
  },
  image: {
    width: width * 0.9,
    height: height * 0.35,
    alignSelf: 'center',
    marginTop: 24,
  },
  email: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  instruction: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  content: {
    flex: 1,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -7 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    width: 400,
    minHeight: 500,
  },
  inputContent: {
    paddingVertical: 8,
  },
  inputOutline: {
    borderRadius: 12,
  },
  errorText: {
    marginTop: -10,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;