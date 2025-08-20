import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, Animated, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Avatar, Searchbar, Badge, Divider, Card, IconButton } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { RunnerNavigationProp } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getChats } from '../../services/runnerServices';
import * as Animatable from 'react-native-animatable';

interface MessagesScreenProps {
  navigation: RunnerNavigationProp;
  route: any;
}

const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Handle navigation parameters from notifications
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Handle route parameters when component mounts or route changes
  useEffect(() => {
    if (route?.params?.selectedChatId) {
      setSelectedChatId(route.params.selectedChatId);
      // Clear selection after 3 seconds
      setTimeout(() => setSelectedChatId(null), 3000);
    }
  }, [route?.params]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const scrollY = new Animated.Value(0);

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

    return (<Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Animatable.View
          animation="fadeInUp"
          delay={index * 100}
          duration={500}
        >
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
                size={60} 
                source={{ uri: item.avatar }} 
                style={styles.avatar}
              />
              {item.online && (
                <View style={[
                  styles.onlineBadge,
                  { backgroundColor: COLORS.success }
                ]} />
              )}
              <View style={[
                styles.roleBadge,
                { 
                  backgroundColor: item.role === 'buyer' 
                    ? COLORS.primary 
                    : COLORS.accent 
                }
              ]}>
                <MaterialCommunityIcons 
                  name={item.role === 'buyer' ? 'account' : 'run-fast'} 
                  size={12} 
                  color="white" 
                />
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
                  numberOfLines={2}
                >
                  {item.lastMessage}
                </Text>
                
                {item.unread > 0 && (
                  <View style={[
                    styles.unreadBadge,
                    { backgroundColor: theme.colors.primary }
                  ]}>
                    <Text style={styles.unreadText}>
                      {item.unread > 99 ? '99+' : item.unread}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <IconButton
              icon="chevron-right"
              size={20}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.chevronIcon}
            />
          </TouchableOpacity>
        </Animatable.View>
        <Divider style={{ 
          marginLeft: 88, 
          backgroundColor: theme.colors.outlineVariant 
        }} />
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={{ 
      flex: 1, 
      backgroundColor: theme.colors.background 
    }}>
      <View style={[styles.container, { 
        backgroundColor: theme.colors.background 
      }]}>
        {/* Enhanced Header */}
        <Animatable.View 
          animation="fadeInDown"
          duration={500}
          style={[styles.header, { 
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outlineVariant
          }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <Text style={[styles.screenTitle, { 
                color: theme.colors.onSurface 
              }]}>
                Messages
              </Text>
              <Text style={[styles.screenSubtitle, { 
                color: theme.colors.onSurfaceVariant 
              }]}>
                {chats.length} conversation{chats.length !== 1 ? 's' : ''}
              </Text>
            </View>
            
            {/* Removed plus button - runners cannot start conversations */}
          </View>
          
          <Searchbar
            placeholder="Search conversations..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={[styles.searchBar, { 
              backgroundColor: theme.colors.surfaceVariant 
            }]}
            iconColor={theme.colors.onSurfaceVariant}
            inputStyle={{ 
              color: theme.colors.onSurface,
              fontSize: 14
            }}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            theme={{
              colors: {
                text: theme.colors.onSurface,
                placeholder: theme.colors.onSurfaceVariant,
              }
            }}
          />
        </Animatable.View>

        {/* Chat List */}
        {chats.length > 0 ? (
          <Animated.FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatList}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
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
        ) : (<Animatable.View 
            animation="fadeInUp"
            delay={300}
            style={styles.emptyState}
          >
            <MaterialCommunityIcons 
              name="message-text-outline" 
              size={80} 
              color={theme.colors.onSurfaceVariant} 
              style={styles.emptyIcon}
            />
            <Text style={[
              styles.emptyTitle, { color: theme.colors.onSurface }
            ]}>
              No conversations yet
            </Text>
            <Text style={[
              styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }
            ]}>
              Your messages with buyers and other runners will appear here. Start accepting errands to begin conversations.
            </Text>
            
            <TouchableOpacity
              style={[styles.emptyActionButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Errands')}
            >
              <MaterialCommunityIcons name="run-fast" size={20} color="white" />
              <Text style={styles.emptyActionText}>Start Accepting Errands</Text>
            </TouchableOpacity>
          </Animatable.View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 45,
  },
  header: {
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleSection: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  searchBar: {
    elevation: 2,
    borderRadius: 12,
    height: 48,
  },
  chatList: {
    paddingBottom: 16,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    borderRadius: 16,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  roleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chatTitle: {
    fontWeight: '600',
    fontSize: 16,
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
    alignItems: 'flex-end',
  },
  chatDescription: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  unreadDescription: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chevronIcon: {
    margin: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 300,
    opacity: 0.7,
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  emptyActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MessagesScreen;