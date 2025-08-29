import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Animated, TouchableOpacity } from 'react-native';
import { Text, TextInput, IconButton, Avatar, Divider } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getMessages, markMessagesAsRead, subscribeToUserOnlineStatus } from '../../services/chatService';
import messagingService from '../../services/messagingService';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  status?: 'sent' | 'delivered' | 'read';
  animValue?: Animated.Value;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    marginLeft: 12,
  },
  userName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myText: {
    fontWeight: '400',
  },
  theirText: {
    fontWeight: '400',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    marginRight: 4,
  },
  myTimestamp: {
    opacity: 0.8,
  },
  theirTimestamp: {
    opacity: 0.6,
  },
  statusIcons: {
    flexDirection: 'row',
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 120,
    borderRadius: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
});

const MessageItem: React.FC<{
  item: Message;
  chatAvatar?: string;
  chatRole?: string;
  theme: any;
}> = ({ item, chatAvatar, chatRole, theme }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const delay = item.isMe ? 0 : 100;
    
    setTimeout(() => {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 30,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, delay);
  }, [item.isMe, slideAnim]);

  const slideFrom = item.isMe ? 100 : -100;
  
  return (
    <Animated.View 
      style={[
        styles.messageContainer,
        item.isMe ? styles.myMessage : styles.theirMessage,
        {
          transform: [
            {
            translateX: slideAnim.interpolate({
              inputRange: [0, 1],
                outputRange: [slideFrom, 0],
              }),
            },
          ],
        },
      ]}
    >
      {!item.isMe && (
        <View style={styles.avatarContainer}>
          <Avatar.Image
            source={{ uri: chatAvatar || 'https://picsum.photos/200' }}
            size={32}
            style={styles.avatar}
          />
        </View>
      )}
      
      <View
        style={[
        styles.messageBubble,
          item.isMe ? styles.myBubble : styles.theirBubble,
          {
            backgroundColor: item.isMe ? theme.colors.primary : theme.colors.surfaceVariant,
          },
        ]}
      >
        <Text
          style={[
          styles.messageText,
            item.isMe ? styles.myText : styles.theirText,
            {
              color: item.isMe ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {item.text}
        </Text>
        
        <View style={styles.messageFooter}>
          <Text
            style={[
            styles.timestamp,
              item.isMe ? styles.myTimestamp : styles.theirTimestamp,
              {
                color: item.isMe ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          
          {item.isMe && (
            <View style={styles.statusIcons}>
              {item.status === 'sent' && (
                <MaterialCommunityIcons
                  name="check"
                  size={14}
                  color={theme.colors.onPrimary}
                  style={{ opacity: 0.6 }}
                />
              )}
              {item.status === 'delivered' && (
                <MaterialCommunityIcons
                  name="check-all"
                  size={14}
                  color={theme.colors.onPrimary}
                  style={{ opacity: 0.6 }}
                />
              )}
              {item.status === 'read' && (
                <MaterialCommunityIcons
                  name="check-all"
                  size={14}
                  color={theme.colors.onPrimary}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const ChatScreen: React.FC<{ route: RouteProp<any, any> }> = ({ route }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const inputAnim = useRef(new Animated.Value(0)).current;
  const { chatId, chatName, chatAvatar, chatRole, otherUserId } = route.params || {};
  const { theme } = useTheme();
  const { user } = useAuth();

  // Mark messages as read when chat screen is opened
  useEffect(() => {
    if (chatId && user?.uid) {
      markMessagesAsRead(chatId, user.uid).catch((error) => {
        console.error('Error marking messages as read:', error);
      });
    }
  }, [chatId, user?.uid]);

  // Monitor other user's online status
  useEffect(() => {
    if (!otherUserId) return;
    
    const unsubscribe = subscribeToUserOnlineStatus(otherUserId, (status) => {
      // setOnlineStatus(status); // This line was removed as per the edit hint
    });
    
    return () => unsubscribe();
  }, [otherUserId]);

  // Fetch messages from Firestore
  useEffect(() => {
    if (!chatId) return;
    
    const unsubscribe = getMessages(chatId, (msgs) => {
      const processedMessages = msgs.map(msg => {
        const processed = {
          id: msg.id,
          text: msg.content, // Convert content to text
          timestamp: msg.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          isMe: msg.senderId === user?.uid,
          status: msg.read ? 'read' : 'sent',
          animValue: new Animated.Value(0),
        };
        return processed;
      });
      
      setMessages(processedMessages);
    });
    return () => unsubscribe && unsubscribe();
  }, [chatId, user?.uid]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const animateSend = () => {
    Animated.sequence([
      Animated.timing(inputAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(inputAnim, {
        toValue: 0,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const sendMessage = async () => {
    if (message.trim() && user && chatId) {
      animateSend();
      
      try {
        // Get the receiver ID from chat participants
        const chatDoc = await db.collection('chats').doc(chatId).get();
        if (chatDoc.exists) {
          const chatData = chatDoc.data();
          const participants = chatData?.participants || [];
          const receiverId = participants.find((p: string) => p !== user.uid);
          
          if (receiverId) {
            // Use the new messaging service that handles background notifications
            await messagingService.sendMessage(
              chatId,
              user.uid,
              receiverId,
              message.trim(),
              user.displayName || user.email || 'User',
              'buyer' // Default to buyer role, could be enhanced to detect actual role
            );
            
            // Mark messages as read after sending (this will clear unread badges)
            await markMessagesAsRead(chatId, user.uid);
            
            setMessage('');
          } else {
            console.error('Could not find receiver ID');
          }
        } else {
          console.error('Chat document does not exist');
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <MessageItem 
        item={item} 
        chatAvatar={chatAvatar} 
        chatRole={chatRole} 
        theme={theme}
      />
    );
  }, [chatAvatar, chatRole, theme]);

  return (<KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Avatar.Image
              source={{ uri: chatAvatar || 'https://picsum.photos/200' }}
              size={40}
            />
            <View style={styles.userText}>
              <Text variant="titleMedium" style={[styles.userName, { color: theme.colors.onSurface }]}>
                {chatName || 'Chat'}
              </Text>
              <Text variant="bodySmall" style={[styles.status, { color: theme.colors.onSurfaceVariant }]}>
                {chatRole === 'seller' ? 'Store' : chatRole === 'buyer' ? 'Buyer' : chatRole === 'runner' ? 'Runner' : 'User'} • Online
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon="dots-vertical"
              size={24}
              iconColor={theme.colors.onSurface}
              onPress={() => {}}
            />
          </View>
        </View>
      </View>

      <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <Animated.View 
        style={[
          styles.inputContainer, 
          { 
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant,
            transform: [{ scale: inputAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.95]
            })}]
          }
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            mode="flat"
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            contentStyle={styles.inputContent}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            multiline
            maxLength={500}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            theme={{
              colors: {
                text: theme.colors.onSurface,
                placeholder: theme.colors.onSurfaceVariant,
              }
            }}
          />
          <TouchableOpacity 
            onPress={sendMessage}
            disabled={!message.trim()}
            style={[
              styles.sendButton, 
              { 
                backgroundColor: message.trim() ? theme.colors.primary : theme.colors.surfaceVariant,
              }
            ]}
          >
            <MaterialCommunityIcons 
              name={message.trim() ? "send" : "microphone"} 
              size={24} 
              color={message.trim() ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} 
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;