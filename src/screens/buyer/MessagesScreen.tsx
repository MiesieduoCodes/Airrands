import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, Animated, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { Text, Avatar, Searchbar, Badge, Divider, Button, Card } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { BuyerNavigationProp } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getChats } from '../../services/buyerServices';
import * as Animatable from 'react-native-animatable';

interface MessagesScreenProps {
  navigation: BuyerNavigationProp;
}

const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<any[]>([]);
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const scrollY = new Animated.Value(0);

  const fetchChats = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getChats(user.uid);
      setChats(data as any[]);
      setFilteredChats(data as any[]);
    } catch (e) {
      setError('Failed to fetch chats. Please try again.');
      console.error('Failed to fetch chats:', e);
    } finally {
      setLoading(false);
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

  const renderChatItem = ({ item, index }: { item: any; index: number }) => {
    const inputRange = [-1, 0, 100 * index, 100 * (index + 2)];
    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 1, 0],
    });
    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 1, 0.9],
    });

    return (<Animatable.View 
        animation="fadeInUp" 
        delay={index * 50}
        duration={400}
        useNativeDriver
      >
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('Chat', { 
              chatId: item.id, 
              chatName: item.name, 
              chatAvatar: item.avatar, 
              chatRole: item.role,
              otherUserId: item.participantId
            });
          }}
          style={[styles.chatItem, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Avatar.Image 
                size={52} 
              source={{ uri: item.avatar }} 
              style={styles.avatar}
            />
            {item.online && (
              <View style={[
                styles.onlineBadge,
                  { backgroundColor: theme.colors.primary }
              ]} />
            )}
            <View style={[
              styles.roleBadge,
              { 
                  backgroundColor: item.role === 'seller' 
                    ? theme.colors.primary 
                    : theme.colors.secondary 
                }
              ]}>
                <Text style={[styles.roleText, { color: theme.colors.onPrimary }]}>
                  {item.role === 'seller' ? 'S' : 'R'}
              </Text>
            </View>
          </View>

          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text 
                style={[
                  styles.chatTitle, 
                  { color: theme.colors.onSurface },
                  item.unread > 0 && styles.unreadTitle
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text 
                style={[
                  styles.timestamp, 
                  { color: theme.colors.onSurfaceVariant }
                ]}
              >
                {item.timestamp}
              </Text>
            </View>
            
            <View style={styles.chatFooter}>
              <Text 
                style={[
                  styles.chatDescription, 
                  { color: theme.colors.onSurfaceVariant },
                  item.unread > 0 && styles.unreadDescription
                ]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
              
              {item.unread > 0 && (
                <View style={[
                  styles.unreadBadge,
                  { backgroundColor: theme.colors.primary }
                ]}>
                    <Text style={[styles.unreadText, { color: theme.colors.onPrimary }]}>
                      {item.unread}
                    </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <Divider style={{ 
            marginLeft: 84, 
          backgroundColor: theme.colors.outlineVariant 
        }} />
      </Animated.View>
      </Animatable.View>
    );
  };

  const renderEmptyState = () => (
    <Animatable.View 
      animation="fadeIn" 
      duration={600}
      style={styles.emptyState}
      useNativeDriver
    >
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="message-text-outline" 
          size={48} 
          color={theme.colors.onSurfaceVariant} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        No messages yet
      </Text>
      <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
        Start a conversation to see your chats here!
      </Text>
    </Animatable.View>
  );

  const renderErrorState = () => (
    <Animatable.View 
      animation="fadeIn" 
      duration={600}
      style={styles.errorState}
      useNativeDriver
    >
      <View style={[styles.errorIconContainer, { backgroundColor: theme.colors.errorContainer }]}>
        <MaterialCommunityIcons 
          name="alert-circle-outline" 
          size={48} 
          color={theme.colors.error} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.errorTitle, { color: theme.colors.onSurface }]}>
        Something went wrong
      </Text>
      <Text variant="bodyMedium" style={[styles.errorSubtitle, { color: theme.colors.onSurfaceVariant }]}>
        {error}
      </Text>
      <Button 
        mode="contained" 
        onPress={fetchChats}
        style={styles.retryButton}
      >
        Try Again
      </Button>
    </Animatable.View>
  );

  const renderLoadingState = () => (
    <Animatable.View 
      animation="fadeIn" 
      duration={600}
      style={styles.loadingState}
      useNativeDriver
    >
      <View style={[styles.loadingIconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="message-processing" 
          size={48} 
          color={theme.colors.primary} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.loadingTitle, { color: theme.colors.onSurface }]}>
        Loading messages...
      </Text>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background 
    }}>
      <StatusBar 
        backgroundColor={theme.colors.background} 
        barStyle={theme.dark ? 'light-content' : 'dark-content'} 
      />
      
      <View style={[styles.container, { 
        backgroundColor: theme.colors.background 
      }]}>
        {/* Header */}
        <Animatable.View 
          animation="fadeInDown" 
          duration={500}
          style={[styles.header, { 
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant
          }]}
        >
          <View style={styles.headerContent}>
          <Text style={[styles.screenTitle, { 
            color: theme.colors.onSurface 
          }]}>
            Messages
          </Text>
            <Text style={[styles.screenSubtitle, { 
              color: theme.colors.onSurfaceVariant 
            }]}>
              Your conversations
            </Text>
          </View>
          
          <Searchbar
            placeholder="Search conversations"
            onChangeText={handleSearch}
            value={searchQuery}
            style={[styles.searchBar, { 
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
            }]}
            iconColor={theme.colors.primary}
            inputStyle={[styles.searchInput, { 
              color: theme.colors.onSurface,
              fontSize: 16,
              textAlignVertical: 'center',
              paddingVertical: 12,
              paddingHorizontal: 0,
            }]}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            elevation={0}
            theme={{
              colors: {
                primary: theme.colors.primary,
                onSurface: theme.colors.onSurface,
                elevation: {
                  level2: 'transparent',
                },
              },
              roundness: 12,
            }}
          />
        </Animatable.View>

        {/* Chat List */}
        {loading ? (
          renderLoadingState()
        ) : error ? (
          renderErrorState()
        ) : filteredChats.length === 0 ? (
          renderEmptyState()
        ) : (
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
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,

  },
  header: {
    paddingTop: 12,
    paddingBottom: 26,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  screenSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  searchBar: {
    elevation: 0,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
  },
  searchInput: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    minHeight: 48,
  },
  chatList: {
    paddingBottom: 16,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    borderRadius: 16,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  roleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatTitle: {
    fontWeight: '600',
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatDescription: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  unreadDescription: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 18,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 18,
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 8,
    minWidth: 100,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MessagesScreen;