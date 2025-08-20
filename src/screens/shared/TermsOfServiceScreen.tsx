import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing and using the Airrands application ("App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.',
  },
  {
    title: '2. User Roles and Responsibilities',
    content: `2.1 Buyers
• Must provide accurate delivery information
• Are responsible for payment of orders and delivery fees
• Should communicate respectfully with sellers and runners

2.2 Sellers
• Must provide accurate product information and pricing
• Are responsible for the quality of products
• Must maintain hygiene standards for food items
• Should process orders promptly

2.3 Runners
• Must deliver items in a timely manner
• Should handle items with care
• Must maintain professional conduct
• Should follow delivery instructions carefully`,
  },
  {
    title: '3. Payment Terms',
    content: 'All payments are processed in Nigerian Naira (₦). Delivery fees are calculated based on distance and order size. Cancellation fees may apply for orders cancelled after confirmation.',
  },
  {
    title: '4. User Conduct',
    content: `Users must not:
• Harass other users
• Provide false information
• Use the service for illegal activities
• Attempt to manipulate ratings or reviews
• Share account credentials`,
  },
  {
    title: '5. Privacy and Data',
    content: 'We collect and process user data in accordance with our Privacy Policy. This includes location data, transaction history, and communication records.',
  },
  {
    title: '6. Liability',
    content: `Airrands is not liable for:
• Quality of products from sellers
• Delays in delivery due to external factors
• Loss or damage of items during delivery
• User disputes
• Technical issues beyond our control`,
  },
  {
    title: '7. Account Termination',
    content: 'We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity. Users may also deactivate their accounts through the profile settings.',
  },
  {
    title: '8. Changes to Terms',
    content: 'We may modify these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms.',
  },
  {
    title: '9. Contact Information',
    content: 'For questions about these terms, please contact our support team through the Help Center or email support@airrands.com.',
  },
];

const TermsOfServiceScreen = () => {
  const { theme } = useTheme();
  
  return (<ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={[styles.mainTitle, { color: theme.colors.primary }]}>
          Terms of Service
        </Text>
        <Text variant="bodyLarge" style={[styles.lastUpdated, { color: theme.colors.onSurfaceVariant }]}>
          Last Updated: June 15, _2025
        </Text>

        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {section.title}
            </Text>
            <Text variant="bodyMedium" style={[styles.sectionContent, { color: theme.colors.onSurfaceVariant }]}>
              {section.content}
            </Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text variant="bodySmall" style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            © 2025 Airrands. All rights reserved.
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
  content: {
    padding: 16,
  },
  mainTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lastUpdated: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionContent: {
    lineHeight: 20,
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerText: {
    textAlign: 'center',
  },
});

export default TermsOfServiceScreen; 