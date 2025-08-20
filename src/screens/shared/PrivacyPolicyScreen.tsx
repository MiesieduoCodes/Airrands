import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';

const PrivacyPolicyScreen: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.outline 
      }]}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Privacy Policy
        </Text>
        <Text variant="bodySmall" style={[styles.lastUpdated, { color: theme.colors.onSurfaceVariant }]}>
          Last updated: December 2024
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            At Airrands, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            1. Information We Collect
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurface }]}>
            Personal Information:
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            • Name, email address, phone number{'\n'}
            • Delivery addresses and location data{'\n'}
            • Payment information (processed securely){'\n'}
            • Profile information and preferences
          </Text>
          
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurface }]}>
            Usage Information:
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            • App usage patterns and interactions{'\n'}
            • Order history and preferences{'\n'}
            • Device information and app performance{'\n'}
            • Location data for delivery services
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            2. How We Use Your Information
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We use your information to:{'\n'}
            • Process orders and facilitate deliveries{'\n'}
            • Connect buyers, sellers, and runners{'\n'}
            • Provide customer support and improve our service{'\n'}
            • Send important updates and notifications{'\n'}
            • Ensure platform security and prevent fraud{'\n'}
            • Analyze usage patterns to enhance user experience
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            3. Information Sharing
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We may share your information with:{'\n'}
            • Sellers and runners to fulfill your orders{'\n'}
            • Payment processors for secure transactions{'\n'}
            • Service providers who assist our operations{'\n'}
            • Law enforcement when required by law{'\n'}
            • Other users only with your explicit consent
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            4. Data Security
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We implement industry-standard security measures to protect your data:{'\n'}
            • Encryption of sensitive information{'\n'}
            • Secure data transmission protocols{'\n'}
            • Regular security audits and updates{'\n'}
            • Access controls and authentication{'\n'}
            • Secure storage practices
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            5. Location Services
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We collect location data to:{'\n'}
            • Provide accurate delivery estimates{'\n'}
            • Connect you with nearby sellers and runners{'\n'}
            • Improve delivery routing and efficiency{'\n'}
            • Ensure service availability in your area
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            You can control location permissions in your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            6. Data Retention
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We retain your data for as long as necessary to:{'\n'}
            • Provide our services{'\n'}
            • Comply with legal obligations{'\n'}
            • Resolve disputes and enforce agreements{'\n'}
            • Improve our platform and services
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            You may request deletion of your data, subject to legal requirements.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            7. Your Rights
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            You have the right to:{'\n'}
            • Access your personal data{'\n'}
            • Correct inaccurate information{'\n'}
            • Request deletion of your data{'\n'}
            • Opt out of marketing communications{'\n'}
            • Control app permissions and settings{'\n'}
            • Lodge complaints with data protection authorities
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            8. Cookies and Tracking
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We use cookies and similar technologies to:{'\n'}
            • Remember your preferences{'\n'}
            • Analyze app usage and performance{'\n'}
            • Provide personalized experiences{'\n'}
            • Ensure security and prevent fraud
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            9. Third-Party Services
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            Our app may integrate with third-party services for:{'\n'}
            • Payment processing{'\n'}
            • Analytics and performance monitoring{'\n'}
            • Customer support tools{'\n'}
            • Social media features
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            These services have their own privacy policies.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            10. Children's Privacy
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            11. Changes to This Policy
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or email. Continued use of the service after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            12. Contact Us
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            If you have questions about this Privacy Policy or our data practices, please contact us:{'\n\n'}
            Email: privacy@airrands.com{'\n'}
            Address: Airrands Headquarters, Lagos, Nigeria{'\n'}
            Phone: +234 800 AIRRANDS
          </Text>
        </View>

        <View style={[styles.footer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodySmall" style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            By using Airrands, you consent to the collection and use of your information as described in this Privacy Policy.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lastUpdated: {
    // Color will be set dynamically
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paragraph: {
    lineHeight: 22,
  },
  footer: {
    marginTop: 32,
    padding: 16,
    borderRadius: 8,
  },
  footerText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PrivacyPolicyScreen; 