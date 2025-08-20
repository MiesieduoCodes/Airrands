import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthNavigationProp } from '../../navigation/types';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
  useDerivedValue,
  withTiming
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  image: any;
}

const onboardingData: OnboardingItem[] = [
  {
    id: '1',
    title: 'Errand Services',
    description: 'Get groceries, food, and more delivered to your door in minutes.',
    image: require('../../../assets/Delivery-bro.png')
  },
  {
    id: '2',
    title: 'Real-Time Tracking',
    description: 'Track your orders live on the map with precise updates.',
    image: require('../../../assets/Location tracking-cuate.png')
  },
  {
    id: '3',
    title: 'Secure Payments',
    description: 'Pay safely with multiple payment options available.',
    image: require('../../../assets/Price-cuate.png')
  },
  {
    id: '4',
    title: 'Earn as Runner',
    description: 'Deliver and earn extra income on your own schedule.',
    image: require('../../../assets/Successful purchase-cuate.png')
  },
];

interface OnboardingSlideProps {
  item: OnboardingItem;
  index: number;
  scrollX: Animated.SharedValue<number>;
}

const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ item, index, scrollX }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const imageStyle = useAnimatedStyle(() => {
      const translateY = interpolate(
        scrollX.value,
        inputRange,
        [100, 0, 100],
        Extrapolate.CLAMP
      );
      
      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0, 1, 0],
        Extrapolate.CLAMP
      );

      return {
        opacity,
        transform: [{ translateY }],
      };
    });

    const textStyle = useAnimatedStyle(() => {
      const translateX = interpolate(
        scrollX.value,
        inputRange,
        [width * 0.5, 0, -width * 0.5],
        Extrapolate.CLAMP
      );

      return {
        transform: [{ translateX }],
      };
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.imageContainer, imageStyle]}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
        </Animated.View>
        
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text 
            variant="headlineMedium" 
            style={styles.title}
          >
            {item.title}
          </Text>
          <Text 
            variant="bodyLarge" 
            style={styles.description}
          >
            {item.description}
          </Text>
        </Animated.View>
      </View>
  );
};

interface OnboardingScreenProps {
  navigation: AuthNavigationProp;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingItem>>(null);
  const scrollX = useSharedValue(0);
  const { theme } = useTheme();

  // Check if onboarding has been completed
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('@viewedOnboarding');
        if (value !== null) {
          navigation.replace('Register');
        }
      } catch (error) {
        // Handle error silently
        }
    };

    checkOnboardingStatus();
  }, [navigation]);

  const renderItem = ({ item, index }: { item: OnboardingItem; index: number }) => {
    return (
      <OnboardingSlide 
        item={item} 
        index={index} 
        scrollX={scrollX} 
      />
    );
  };

  const renderPaginationDots = () => {
    return (
      <View style={styles.pagination}>
        {onboardingData.map((_, index) => {
          const isActive = currentIndex === index;
          const dotWidth = useDerivedValue(() => {
            return withTiming(isActive ? 24 : 8, {
              duration: 300,
              easing: Easing.inOut(Easing.ease),
            });
          });
  
          const dotColor = useDerivedValue(() => {
            return withTiming(isActive ? COLORS.primary : COLORS.gray?.[300], {
              duration: 300,
            });
          });
  
          const dotOpacity = useDerivedValue(() => {
            return withTiming(isActive ? 1 : 0.6, {
              duration: 300,
            });
          });
  
          const animatedStyle = useAnimatedStyle(() => {
            return {
              width: dotWidth.value,
              backgroundColor: dotColor.value,
              opacity: dotOpacity.value,
            };
          });
  
          return (
            <Animated.View
              key={index}
              style={[styles.dot, animatedStyle]}
              accessibilityLabel={isActive ? `Current slide, ${index + 1}` : `Go to slide ${index + 1}`}
            />
          );
        })}
      </View>
    );
  };

  const handleNext = async () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Mark onboarding as completed
      try {
        await AsyncStorage.setItem('@viewedOnboarding', 'true');
        navigation.replace('Register');
      } catch (error) {
        navigation.replace('Register');
      }
    }
  };

  const handleSkip = async () => {
    // Mark onboarding as completed when skipped
    try {
      await AsyncStorage.setItem('@viewedOnboarding', 'true');
      navigation.replace('Register');
    } catch (error) {
      navigation.replace('Register');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={e => {
          const x = e.nativeEvent.contentOffset.x;
          scrollX.value = x;
          const newIndex = Math.round(x / width);
          if (newIndex !== currentIndex) {
            runOnJS(setCurrentIndex)(newIndex);
          }
        }}
        keyExtractor={item => item.id}
        scrollEventThrottle={16}
        accessibilityLabel="Onboarding slides"
      />
      
      <View style={[styles.bottomContainer, { backgroundColor: theme.colors.background }]}>
        {renderPaginationDots()}
        
        <View style={styles.buttonContainer}>
          <View style={[styles.buttonWrapper, { backgroundColor: COLORS.primary, shadowColor: COLORS.primaryDark }]}>
            <Button
              mode="contained"
              onPress={handleNext}
              style={[styles.button, { backgroundColor: 'transparent' }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              accessibilityLabel={currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            >
              {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </View>
          
          {currentIndex < onboardingData.length - 1 && (
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              accessibilityLabel="Skip onboarding"
            >
              <Text variant="bodyLarge" style={[styles.skipText, { color: COLORS.primary }]}>
                Skip
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: COLORS.white,
  },
  imageContainer: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: width * 0.8,
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 28,
    marginBottom: 8,
    color: '#E89C31',
  },
  description: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: '#666666',
  },
  bottomContainer: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray?.[300],
  },
  buttonContainer: {
    marginTop: 16,
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: COLORS.primary,
  },
  button: {
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  buttonContent: {
    paddingVertical: 10,
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontWeight: '500',
    fontSize: 15,
    color: COLORS.primary,
  },
});

export default OnboardingScreen;