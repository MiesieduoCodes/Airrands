import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, Checkbox, Snackbar } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { AuthNavigationProp } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { validateField, ValidationRule } from '../../utils/validation';
import { getFirebaseAuthErrorMessage } from '../../utils/authErrors';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  navigation: AuthNavigationProp;
}

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  [key: string]: string[];
  email: string[];
  password: string[];
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, getStoredEmail, getRememberMePreference } = useAuth();
  const { theme } = useTheme();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({ email: [], password: [] });
  
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showErrorSnackbar, setShowErrorSnackbar] = useState(false);

  // Load stored email and remember me preference on component mount
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedEmail = await getStoredEmail();
        const storedRememberMe = await getRememberMePreference();
        
        if (storedEmail) {
          setFormData(prev => ({ ...prev, email: storedEmail }));
        }
        setRememberMe(storedRememberMe);
      } catch (error) {
        console.error('Error loading stored data:', error);
      }
    };

    loadStoredData();
  }, [getStoredEmail, getRememberMePreference]);

  const validationRules: Record<string, ValidationRule> = {
    email: {
      required: true,
      email: true
    },
    password: {
      required: true,
      minLength: 1
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = { email: [], password: [] };
    let isValid = true;

    // Validate each field
    Object.keys(validationRules).forEach(field => {
      const validationResult = validateField(formData[field as keyof FormData], validationRules[field]);
      if (!validationResult.isValid) {
        newErrors[field] = validationResult.errors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev: FormData) => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field] && errors[field].length > 0) {
      setErrors((prev: FormErrors) => ({ ...prev, [field]: [] }));
    }
    setLoginError(null); // Clear error when user starts typing
    setShowErrorSnackbar(false); // Hide snackbar when user starts typing
  };

  const handleLogin = async () => {
    setLoginError(null);
    setShowErrorSnackbar(false);
    
    if (!validateForm()) return;

    try {
      await login(formData.email, formData.password, rememberMe);
    } catch (error: any) {
      const userFriendlyMessage = getFirebaseAuthErrorMessage(error);
      setLoginError(userFriendlyMessage);
      setShowErrorSnackbar(true);
    }
  };

  const isFormValid = () => {
    return formData.email && formData.password;
  };

  return (
      <View style={styles.content}>
        <Animated.View entering={FadeIn.delay(200).duration(800)}>
          <Image 
        source={require('../../../assets/Login-cuate.png')}
        style={styles.image}
        resizeMode="contain"
      />
        </Animated.View>

        <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
        <Animated.View entering={FadeInDown.delay(400).duration(800)}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              Welcome Back
          </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Sign in to continue your journey
          </Text>
        </Animated.View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 50}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >


        <View style={styles.form}>
          <Animated.View entering={FadeInDown.delay(600).duration(800)}>
            <TextInput
              label="Email Address"
              value={formData.email}
              onChangeText={(text: string) => handleFieldChange('email', text)}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
              style={[styles.input, { backgroundColor: theme.colors.surface, marginBottom: 12 }]}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              error={errors?.email.length > 0}
              theme={{
                colors: {
                  primary: theme.colors.primary,
                  placeholder: theme.colors.onSurfaceVariant,
                  error: theme.colors.error,
                }
              }}
              editable={!loading}
            />
            {errors?.email.length > 0 && (
              <HelperText type="error" visible={errors?.email.length > 0} style={styles.errorText}>
                {errors?.email?.[0]}
              </HelperText>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(900).duration(800)}>
            <TextInput
              label="Password"
              value={formData.password}
              onChangeText={(text: string) => handleFieldChange('password', text)}
              mode="outlined"
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                  color={theme.colors.onSurfaceVariant}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                />
              }
              style={[styles.input, { backgroundColor: theme.colors.surface, marginBottom: 12 }]}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              error={errors?.password.length > 0}
              theme={{
                colors: {
                  primary: theme.colors.primary,
                  placeholder: theme.colors.onSurfaceVariant,
                  error: theme.colors.error,
                }
              }}
              editable={!loading}
            />
            {errors?.password.length > 0 && (
              <HelperText type="error" visible={errors?.password.length > 0} style={styles.errorText}>
                {errors?.password?.[0]}
              </HelperText>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1000).duration(800)}>
            <View style={styles.rememberMeContainer}>
              <Checkbox
                status={rememberMe ? 'checked' : 'unchecked'}
                onPress={() => setRememberMe(!rememberMe)}
                color={theme.colors.primary}
              />
              <Text 
                variant="bodyMedium" 
                style={[styles.rememberMeText, { color: theme.colors.onSurfaceVariant }]}
                onPress={() => setRememberMe(!rememberMe)}
              >
                Remember me (Stay logged in)
              </Text>
            </View>
            <Text 
              variant="bodySmall" 
              style={[styles.rememberMeInfo, { color: theme.colors.onSurfaceVariant }]}
            >
              You'll stay logged in until you manually sign out
            </Text>
          </Animated.View>
          </View>
</ScrollView>
</KeyboardAvoidingView>
          <Animated.View entering={FadeInDown.delay(1100).duration(800)}>
            <Button
              mode="contained"
              onPress={handleLogin}
              disabled={!isFormValid() || loading}
              loading={loading}
              style={[styles.button, { backgroundColor: theme.colors.primary, marginTop: 24, marginBottom: 16 }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Sign In
            </Button>
            {loginError && (
              <HelperText type="error" visible={!!loginError} style={styles.loginErrorText}>
                {loginError}
              </HelperText>
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(1200).duration(800)}>
            <View style={styles.footer}>
              <Text variant="bodyMedium" style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            New to Airrands?{' '}
          </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text variant="bodyMedium" style={[styles.link, { color: theme.colors.primary }]}>
              Sign Up
            </Text>
          </TouchableOpacity>
            </View>
        </Animated.View>

          <Animated.View entering={FadeInUp.delay(1300).duration(800)}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotPasswordTouchable}>
              <Text variant="bodyMedium" style={[styles.forgotPassword, { color: theme.colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Error Snackbar */}
        <Snackbar
          visible={showErrorSnackbar}
          onDismiss={() => setShowErrorSnackbar(false)}
          duration={6000}
          action={{
            label: 'Dismiss',
            onPress: () => setShowErrorSnackbar(false),
          }}
          style={{
            backgroundColor: theme.colors.errorContainer,
            marginBottom: 20,
          }}
          wrapperStyle={{ bottom: 0 }}
        >
          <Text style={{ color: theme.colors.onErrorContainer, fontWeight: '500' }}>
            {loginError}
          </Text>
        </Snackbar>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: width * 0.9,
    height: height * 0.35,
    alignSelf: 'center',
    marginTop: 24,
  },
  content: {
    flex: 1,
    // paddingHorizontal: 32,
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -7 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
  form: {
    gap: 24,
    marginBottom: 24,
  },
  input: {
    borderRadius: 12,
  },
  inputContent: {
    paddingVertical: 8,
  },
  inputOutline: {
    borderRadius: 12,
  },
  button: {
    borderRadius: 12,
    elevation: 0,
    marginTop: 8,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  footerText: {
    opacity: 0.8,
    fontSize: 16,
  },
  link: {
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    fontWeight: 'bold',
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 4,
    fontSize: 14,
  },
  loginErrorText: {
    fontWeight: 'bold',
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
    fontSize: 16,
  },
  forgotPasswordTouchable: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    fontWeight: '600',
    fontSize: 16 ,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
  },
  rememberMeInfo: {
    marginLeft: 32,
    marginTop: 4,
    opacity: 0.7,
    fontSize: 12,
  },
});

export default LoginScreen;