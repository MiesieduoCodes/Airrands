import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, RefreshControl, StatusBar, Platform } from 'react-native';
import { Text, List, Avatar, Searchbar, Badge, Surface } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { SellerNavigationProp } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import * as Animatable from 'react-native-animatable';
import { useAuth } from '../../contexts/AuthContext';
import { getChats } from '../../services/sellerServices';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MessagesScreenProps {
  navigation: SellerNavigationProp;
}

const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<any[]>([]);
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();

  const fetchChats = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const data = await getChats(user.uid);
      setChats(data as any[]);
      setFilteredChats(data as any[]);
    } catch (e) {
      console.error('Failed to fetch chats:', e);
    }
  }, [user?.uid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  }, [fetchChats]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = chats.filter(chat =>
      chat.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredChats(filtered);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const renderChatItem = ({ item, index }: { item: any; index: number }) => (
    <Animatable.View 
      animation="fadeInUp" 
      delay={index * 50} 
      duration={400}
      style={styles.animatableContainer}
    >
      <Surface style={[styles.chatCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <List.Item
          title={item.name}
          titleStyle={[styles.chatTitle, { color: theme.colors.onSurface }]}
          description={item.lastMessage}
          descriptionStyle={[styles.chatDescription, { color: theme.colors.onSurfaceVariant }]}
          descriptionNumberOfLines={2}
          left={props => (
            <View style={styles.avatarContainer}>
              <Avatar.Image 
                size={52} 
                source={{ uri: item.avatar }} 
                style={styles.avatar}
              />
              <View style={[styles.onlineIndicator, { 
                backgroundColor: item.isOnline ? COLORS.success : theme.colors.outlineVariant 
              }]} />
              <Badge 
                style={[
                  styles.roleBadge, 
                  { 
                    backgroundColor: item.role === 'buyer' ? COLORS.primary : COLORS.accent,
                    color: theme.colors.surface
                  }
                ]}
              >
                {item.role === 'buyer' ? 'B' : 'R'}
              </Badge>
            </View>
          )}
          right={props => (
            <View style={styles.rightContent}>
              <Text variant="bodySmall" style={[styles.timestamp, { color: theme.colors.onSurfaceVariant }]}>
                {formatTimestamp(item.timestamp)}
              </Text>
              {item.unread > 0 && (
                <Badge 
                  style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}
                  size={20}
                >
                  {item.unread > 99 ? '99+' : item.unread}
                </Badge>
              )}
            </View>
          )}
          onPress={() => {
            navigation.navigate('Chat', { 
              chatId: item.id, 
              chatName: item.name, 
              chatAvatar: item.avatar, 
              chatRole: item.role,
              otherUserId: item.participantId // Add the other user's ID
            });
          }}
          style={styles.chatItem}
          contentStyle={styles.chatItemContent}
        />
      </Surface>
    </Animatable.View>
  );

  const renderEmptyState = () => (
    <Animatable.View animation="fadeIn" duration={800} style={styles.emptyState}>
      <View style={[styles.emptyStateIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="message-text-outline" 
          size={48} 
          color={theme.colors.onSurfaceVariant} 
        />
      </View>
      <Text variant="headlineSmall" style={[styles.emptyStateTitle, { color: theme.colors.onSurface }]}>
        No messages yet
      </Text>
      <Text variant="bodyMedium" style={[styles.emptyStateSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        Start selling to connect with buyers and runners
      </Text>
    </Animatable.View>
  );

  return (<SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text variant="headlineLarge" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Messages
            </Text>
            <View style={styles.headerStats}>
              <View style={[styles.statItem, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="titleMedium" style={[styles.statNumber, { color: theme.colors.primary }]}>
                  {chats.length}
                </Text>
                <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Conversations
                </Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text variant="titleMedium" style={[styles.statNumber, { color: theme.colors.secondary }]}>
                  {chats.filter(chat => chat.unreadCount > 0).length}
                </Text>
                <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Unread
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search conversations..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
          iconColor={theme.colors.onSurfaceVariant}
          inputStyle={[styles.searchInput, { color: theme.colors.onSurface }]}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          elevation={0}
        />
      </View>

      {chats.length > 0 ? (
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
              title="Pull to refresh"
              titleColor={theme.colors.onSurfaceVariant}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchBar: {
    borderRadius: 16,
    elevation: 0,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchInput: {
    fontSize: 16,
  },
  animatableContainer: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  chatCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  chatList: {
    paddingBottom: 24,
  },
  chatItem: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  chatItemContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chatTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 22,
    color: '#1A1A1A',
  },
  chatDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    color: '#6C757D',
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    borderRadius: 26,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 10,
    fontWeight: 'bold',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#007AFF',
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
    paddingVertical: 4,
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
    color: '#6C757D',
  },
  unreadBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
  },
  separator: {
    height: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 80,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
  },
  emptyStateTitle: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 18,
    color: '#1A1A1A',
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
    color: '#6C757D',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 20,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default MessagesScreen; 