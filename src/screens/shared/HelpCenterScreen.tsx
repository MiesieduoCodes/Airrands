import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, List, Searchbar, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const HelpCenterScreen: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const faqData = [
    {
      title: 'How do I place an order?',
      content: 'To place an order, browse through the available products, add items to your cart, and proceed to checkout. You can then select your delivery address and payment method.',
    },
    {
      title: 'How long does delivery take?',
      content: 'Delivery times vary depending on your location and the seller\'s preparation time. Typically, orders are delivered within 30-60 minutes after confirmation.',
    },
    {
      title: 'What payment methods are accepted?',
      content: 'We accept various payment methods including cash on delivery, bank transfers, and mobile money payments. Payment options may vary by location.',
    },
    {
      title: 'How do I track my order?',
      content: 'You can track your order in real-time through the app. Navigate to the Orders section to see your order status and delivery updates.',
    },
    {
      title: 'What if I receive the wrong order?',
      content: 'If you receive the wrong order, please contact our customer support immediately. We\'ll work to resolve the issue and ensure you receive the correct items.',
    },
    {
      title: 'How do I become a seller?',
      content: 'To become a seller, you need to register as a seller account, provide necessary documentation, and complete the verification process. Contact us for more details.',
    },
    {
      title: 'How do I become a runner?',
      content: 'To become a runner, you need to register as a runner account, provide identification documents, and complete a background check. Contact us for more details.',
    },
    {
      title: 'How do I report an issue?',
      content: 'You can report issues through the app by going to the Help Center or contacting our customer support team directly.',
    },
  ];

  const contactInfo = [
    {
      title: 'Customer Support',
      subtitle: '24/7 Support',
      icon: 'headset',
      action: 'Call Now',
    },
    {
      title: 'Email Support',
      subtitle: 'support@airrands.com',
      icon: 'email',
      action: 'Send Email',
    },
    {
      title: 'Live Chat',
      subtitle: 'Chat with us',
      icon: 'chat',
      action: 'Start Chat',
    },
  ];

  const handleAccordionPress = (expandedId: string | false) => {
    setExpanded(expandedId);
  };

  const filteredFaq = faqData.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (<ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Help Center
        </Text>
        <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Find answers to common questions and get support
        </Text>
      </View>

      <View style={[styles.searchSection, { backgroundColor: theme.colors.surface }]}>
        <Searchbar
          placeholder="Search for help..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          iconColor={theme.colors.onSurfaceVariant}
          inputStyle={{ color: theme.colors.onSurface }}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
      </View>

      <View style={styles.section}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Frequently Asked Questions
        </Text>
        
        {filteredFaq.map((item, index) => (<TouchableOpacity
            key={index}
            style={[styles.faqItem, { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={() => handleAccordionPress(expanded === index.toString() ? false : index.toString())}
          >
            <View style={styles.faqHeader}>
              <Text variant="titleMedium" style={[styles.faqTitle, { color: theme.colors.onSurface }]}>
                {item.title}
              </Text>
              <MaterialIcons
                name={expanded === index.toString() ? "expand-less" : "expand-more"}
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
            {expanded === index.toString() && (
              <Text variant="bodyMedium" style={[styles.faqContent, { color: theme.colors.onSurfaceVariant }]}>
                {item.content}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Contact Support
        </Text>
        
        {contactInfo.map((item, index) => (<List.Item
            key={index}
            title={item.title}
            description={item.subtitle}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={props => <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />}
            right={props => (
              <Button
                mode="outlined"
                onPress={() => {}}
                style={styles.contactButton}
                textColor={theme.colors.primary}
                buttonColor="transparent"
              >
                {item.action}
              </Button>
            )}
            style={[styles.contactItem, { backgroundColor: theme.colors.surfaceVariant }]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
          Still need help? Our support team is available 24/7 to assist you.
        </Text>
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
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  searchSection: {
    padding: 16,
  },
  searchBar: {
    elevation: 0,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  faqItem: {
    borderRadius: 8,
    marginBottom: 8,
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqTitle: {
    flex: 1,
    fontWeight: '600',
    marginRight: 8,
  },
  faqContent: {
    lineHeight: 20,
    marginTop: 12,
  },
  contactItem: {
    marginBottom: 8,
    borderRadius: 8,
  },
  contactButton: {
    alignSelf: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
});

export default HelpCenterScreen; 