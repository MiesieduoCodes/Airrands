import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100)); // Start off-screen

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      setIsOffline(offline);

      if (offline) {
        slideDown();
      } else {
        slideUp();
      }
    });
    return () => unsubscribe();
  }, []);

  const slideDown = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const slideUp = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }], backgroundColor: isOffline ? '#b71c1c' : '#4CAF50' }]}>
      <Text style={styles.text}>{isOffline ? 'You are offline' : 'You are back online'}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default OfflineBanner;