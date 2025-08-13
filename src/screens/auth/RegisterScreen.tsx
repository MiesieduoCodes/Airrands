import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  Divider,
  Portal,
  Modal,
  RadioButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthNavigationProp } from '../../navigation/types';
import { UserRole } from '../../navigation/types';
import * as Animatable from 'react-native-animatable';
import { FadeInDown } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface RegisterScreenProps {
  navigation: AuthNavigationProp;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [emailVerificationModalVisible, setEmailVerificationModalVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { theme } = useTheme();
  const { register, resendVerificationEmail } = useAuth();
  const [registerError, setRegisterError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setRegisterError(null);
  };

  const handleSubmit = async () => {
    setRegisterError(null);
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await register(formData.email, formData.password, selectedRole);
      setEmailVerificationModalVisible(true);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        setRegisterError('You do not have permission to register.');
      } else if (error.message && error.message.includes('timeout')) {
        setRegisterError('Request timed out. Please try again.');
      } else if (error.message && error.message.includes('network')) {
        setRegisterError('Network error. Please check your connection.');
      } else if (error.message) {
        setRegisterError(error.message);
      } else {
        setRegisterError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      Alert.alert(
        'Verification Email Sent',
        'Please check your inbox for the verification link.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Failed to Send Email',
        error.message || 'Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleGoToLogin = () => {
    setEmailVerificationModalVisible(false);
    navigation.navigate('Login');
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'buyer':
        return 'Order food and request errands from local stores and runners';
      case 'seller':
        return 'Sell your products and manage your store';
      case 'runner':
        return 'Deliver orders and run errands for customers';
      default:
        return '';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'buyer':
        return 'cart';
      case 'seller':
        return 'store';
      case 'runner':
        return 'run';
      default:
        return 'account';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Animatable.View animation="fadeInDown" duration={800}>
            <Image
              source={require('../../../assets/Sign up-cuate.png')}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel="Sign up illustration"
            />
          </Animatable.View>
          
          <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
            <Animatable.View animation="fadeInUp" duration={800} delay={200}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Create Account
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                Join Airrands and start your journey
              </Text>
            </Animatable.View>

            <View style={styles.form}>
              <Animatable.View animation="fadeInUp" duration={800} delay={400}>
                <TextInput
                  label="Full Name"
                  value={formData.name}
                  onChangeText={(text) => handleFieldChange('name', text)}
                  mode="outlined"
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  error={!!errors?.name}
                  left={<TextInput.Icon icon="account" />}
                  theme={{
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      error: theme.colors.error,
                    }
                  }}
                />
                {errors?.name ? (
                  <HelperText type="error" visible={!!errors?.name} style={styles.errorText}>
                    {errors?.name}
                  </HelperText>
                ) : null}
              </Animatable.View>

              <Animatable.View animation="fadeInUp" duration={800} delay={500}>
                <TextInput
                  label="Email Address"
                  value={formData.email}
                  onChangeText={(text) => handleFieldChange('email', text)}
                  mode="outlined"
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={!!errors?.email}
                  left={<TextInput.Icon icon="email" />}
                  theme={{
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      error: theme.colors.error,
                    }
                  }}
                />
                {errors?.email ? (
                  <HelperText type="error" visible={!!errors?.email} style={styles.errorText}>
                    {errors?.email}
                  </HelperText>
                ) : null}
              </Animatable.View>

              <Animatable.View animation="fadeInUp" duration={800} delay={600}>
                <TextInput
                  label="Phone Number"
                  value={formData.phone}
                  onChangeText={(text) => handleFieldChange('phone', text)}
                  mode="outlined"
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  keyboardType="phone-pad"
                  error={!!errors?.phone}
                  left={<TextInput.Icon icon="phone" />}
                  theme={{
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      error: theme.colors.error,
                    }
                  }}
                />
                {errors?.phone ? (
                  <HelperText type="error" visible={!!errors?.phone} style={styles.errorText}>
                    {errors?.phone}
                  </HelperText>
                ) : null}
              </Animatable.View>

              {/* Role Selection */}
              <Animatable.View animation="fadeInUp" duration={800} delay={700}>
                <TouchableOpacity
                  onPress={() => setRoleModalVisible(true)}
                  style={[styles.roleSelector, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  }]}
                  activeOpacity={0.8}
                >
                  <View style={styles.roleSelectorContent}>
                    <MaterialCommunityIcons 
                      name={getRoleIcon(selectedRole)} 
                      size={24} 
                      color={theme.colors.primary} 
                      style={styles.roleIcon}
                    />
                    <View style={styles.roleTextContainer}>
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        I want to join as a
                      </Text>
                      <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                      </Text>
                    </View>
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={24} 
                      color={theme.colors.onSurfaceVariant} 
                    />
                  </View>
                  <Text variant="bodySmall" style={[styles.roleDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {getRoleDescription(selectedRole)}
                  </Text>
                </TouchableOpacity>
              </Animatable.View>

              <Animatable.View animation="fadeInUp" duration={800} delay={800}>
                <TextInput
                  label="Password"
                  value={formData.password}
                  onChangeText={(text) => handleFieldChange('password', text)}
                  mode="outlined"
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  secureTextEntry={!showPassword}
                  error={!!errors?.password}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                      color={theme.colors.onSurfaceVariant}
                    />
                  }
                  theme={{
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      error: theme.colors.error,
                    }
                  }}
                />
                {errors?.password ? (
                  <HelperText type="error" visible={!!errors?.password} style={styles.errorText}>
                    {errors?.password}
                  </HelperText>
                ) : (
                  <HelperText type="info" visible style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                    *At least 8 characters with one uppercase letter
                  </HelperText>
                )}
              </Animatable.View>

              <Animatable.View animation="fadeInUp" duration={800} delay={900}>
                <TextInput
                  label="Confirm Password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleFieldChange('confirmPassword', text)}
                  mode="outlined"
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                  contentStyle={styles.inputContent}
                  outlineStyle={styles.inputOutline}
                  secureTextEntry={!showConfirmPassword}
                  error={!!errors?.confirmPassword}
                  left={<TextInput.Icon icon="lock-check" />}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      color={theme.colors.onSurfaceVariant}
                    />
                  }
                  theme={{
                    colors: {
                      primary: theme.colors.primary,
                      placeholder: theme.colors.onSurfaceVariant,
                      error: theme.colors.error,
                    }
                  }}
                />
                {errors?.confirmPassword ? (
                  <HelperText type="error" visible={!!errors?.confirmPassword} style={styles.errorText}>
                    {errors?.confirmPassword}
                  </HelperText>
                ) : null}
              </Animatable.View>
              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={isLoading}
                style={[styles.button, { 
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }]}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Create Account
              </Button>
              {isLoading && (
                <ActivityIndicator 
                  color={theme.colors.primary}
                  style={{marginTop: 16}}
                />
              )}
              
              {registerError && (
                <HelperText type="error" visible={!!registerError} style={styles.errorText}>
                  {registerError}
                </HelperText>
              )}
            </View>

            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

            <Animated.View entering={FadeInDown.delay(1400).duration(800)}>
              <View style={styles.footer}>
                <Text variant="bodyMedium" style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
                  Already have an account?
                </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.6}
                >
                  <Text variant="bodyMedium" style={[styles.linkText, { color: theme.colors.primary }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </View>
      </ScrollView>

      {/* Role Selection Modal */}
      <Portal>
        <Modal
          visible={roleModalVisible}
          onDismiss={() => setRoleModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { 
            backgroundColor: theme.colors.surface,
            marginHorizontal: 24,
          }]}
        >
          <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Choose Your Role
          </Text>
          <Text variant="bodyMedium" style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Select how you want to use Airrands
          </Text>

          <RadioButton.Group onValueChange={(value) => setSelectedRole(value as UserRole)} value={selectedRole}>
            <TouchableOpacity 
              style={[styles.roleOption, selectedRole === 'buyer' && styles.selectedRoleOption]}
              onPress={() => setSelectedRole('buyer')}
              activeOpacity={0.8}
            >
              <RadioButton 
                value="buyer" 
                color={theme.colors.primary}
                uncheckedColor={theme.colors.onSurfaceVariant}
              />
              <View style={styles.roleOptionContent}>
                <View style={styles.roleOptionHeader}>
                  <MaterialCommunityIcons 
                    name="cart" 
                    size={20} 
                    color={selectedRole === 'buyer' ? theme.colors.primary : theme.colors.onSurfaceVariant} 
                  />
                  <Text variant="titleMedium" style={[
                    styles.roleOptionTitle,
                    { 
                      color: selectedRole === 'buyer' ? theme.colors.primary : theme.colors.onSurface,
                      marginLeft: 8,
                    }
                  ]}>
                    Buyer
                  </Text>
                </View>
                <Text variant="bodySmall" style={[
                  styles.roleOptionDescription,
                  { color: theme.colors.onSurfaceVariant }
                ]}>
                  Order food and request errands from local stores and runners
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleOption, selectedRole === 'seller' && styles.selectedRoleOption]}
              onPress={() => setSelectedRole('seller')}
              activeOpacity={0.8}
            >
              <RadioButton 
                value="seller" 
                color={theme.colors.primary}
                uncheckedColor={theme.colors.onSurfaceVariant}
              />
              <View style={styles.roleOptionContent}>
                <View style={styles.roleOptionHeader}>
                  <MaterialCommunityIcons 
                    name="store" 
                    size={20} 
                    color={selectedRole === 'seller' ? theme.colors.primary : theme.colors.onSurfaceVariant} 
                  />
                  <Text variant="titleMedium" style={[
                    styles.roleOptionTitle,
                    { 
                      color: selectedRole === 'seller' ? theme.colors.primary : theme.colors.onSurface,
                      marginLeft: 8,
                    }
                  ]}>
                    Seller
                  </Text>
                </View>
                <Text variant="bodySmall" style={[
                  styles.roleOptionDescription,
                  { color: theme.colors.onSurfaceVariant }
                ]}>
                  Sell your products and manage your store
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleOption, selectedRole === 'runner' && styles.selectedRoleOption]}
              onPress={() => setSelectedRole('runner')}
              activeOpacity={0.8}
            >
              <RadioButton 
                value="runner" 
                color={theme.colors.primary}
                uncheckedColor={theme.colors.onSurfaceVariant}
              />
              <View style={styles.roleOptionContent}>
                <View style={styles.roleOptionHeader}>
                  <MaterialCommunityIcons 
                    name="run" 
                    size={20} 
                    color={selectedRole === 'runner' ? theme.colors.primary : theme.colors.onSurfaceVariant} 
                  />
                  <Text variant="titleMedium" style={[
                    styles.roleOptionTitle,
                    { 
                      color: selectedRole === 'runner' ? theme.colors.primary : theme.colors.onSurface,
                      marginLeft: 8,
                    }
                  ]}>
                    Runner
                  </Text>
                </View>
                <Text variant="bodySmall" style={[
                  styles.roleOptionDescription,
                  { color: theme.colors.onSurfaceVariant }
                ]}>
                  Deliver orders and run errands for customers
                </Text>
              </View>
            </TouchableOpacity>
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={() => setRoleModalVisible(false)}
            style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
            labelStyle={styles.modalButtonLabel}
          >
            Confirm Selection
          </Button>
        </Modal>
      </Portal>

      {/* Email Verification Modal */}
      <Portal>
        <Modal
          visible={emailVerificationModalVisible}
          onDismiss={() => setEmailVerificationModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, { 
            backgroundColor: theme.colors.surface,
            marginHorizontal: 24,
          }]}
        >
          <View style={styles.verificationContent}>
            <Animatable.View 
              animation="pulse" 
              iterationCount="infinite"
              style={styles.verificationIconContainer}
            >
              <MaterialCommunityIcons 
                name="email-check" 
                size={64} 
                color={theme.colors.primary} 
              />
            </Animatable.View>
            
            <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Verify Your Email
            </Text>
            
            <Text variant="bodyMedium" style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              We've sent a verification link to:
            </Text>
            
            <Text variant="bodyMedium" style={[styles.emailText, { color: theme.colors.primary, fontWeight: '600' }]}>
              {formData.email}
            </Text>
            
            <Text variant="bodySmall" style={[styles.verificationInstructions, { color: theme.colors.onSurfaceVariant }]}>
              Please check your email and click the verification link to activate your account.
            </Text>
            
            <View style={styles.spamFolderTip}>
              <MaterialCommunityIcons 
                name="alert-circle-outline" 
                size={20} 
                color={theme.colors.tertiary} 
              />
              <Text variant="bodySmall" style={[styles.spamFolderText, { color: theme.colors.tertiary }]}>
                💡 Tip: Check your spam/junk folder if you don't see the email in your inbox
              </Text>
            </View>
            
            <View style={styles.verificationActions}>
              <Button
                mode="outlined"
                onPress={handleResendVerification}
                style={[styles.verificationButton, { borderColor: theme.colors.primary }]}
                labelStyle={{ color: theme.colors.primary }}
              >
                Resend Email
              </Button>
              
              <Button
                mode="contained"
                onPress={handleGoToLogin}
                style={[styles.verificationButton, { 
                  backgroundColor: theme.colors.primary,
                  marginTop: 12,
                }]}
                labelStyle={{ color: theme.colors.onPrimary }}
              >
                Go to Login
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  image: {
    width: width * 0.9,
    height: height * 0.35,
    alignSelf: 'center',
    marginTop: 24,
  },
  content: {
    flex: 1,
    paddingBottom: 6,
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  form: {
    gap: 16,
  },
  input: {
    borderRadius: 12,
    marginBottom: 8,
  },
  inputContent: {
    paddingVertical: 8,
  },
  inputOutline: {
    borderRadius: 12,
  },
  button: {
    borderRadius: 12,
    marginTop: 8,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: -8,
    marginBottom: 8,
  },
  helperText: {
    marginTop: -8,
    marginBottom: 8,
  },
  roleSelector: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  roleSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleIcon: {
    marginRight: 12,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleDescription: {
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 16,
  },
  linkText: {
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  selectedRoleOption: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  roleOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  roleOptionHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  roleOptionTitle: {
    fontWeight: '600',
  },
  roleOptionDescription: {
    fontSize: 12,
  },
  modalButton: {
    marginTop: 28,
    borderRadius: 12,
    height: 48,
  },
  modalButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  verificationContent: {
    alignItems: 'center',
  },
  verificationIconContainer: {
    marginBottom: 16,
  },
  emailText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  verificationInstructions: {
    marginBottom: 24,
    textAlign: 'center',
  },
  verificationActions: {
    width: '100%',
  },
  verificationButton: {
    borderRadius: 12,
    height: 48,
  },
  spamFolderTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  spamFolderText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RegisterScreen;