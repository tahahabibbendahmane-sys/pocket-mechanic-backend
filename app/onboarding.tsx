import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, Dimensions, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADIUS, TYPE } from '@/constants/DesignSystem';

const { width } = Dimensions.get('window');
const ONBOARDING_COMPLETE_KEY = 'ONBOARDING_COMPLETE';
const LEGACY_COMPLETE_KEY = '@pocket_mechanic:onboarding_complete';

type Slide = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    key: 'track',
    icon: 'car-sport-outline',
    title: 'Track Your Ride',
    subtitle: 'Keep your car healthy with smart maintenance tracking',
  },
  {
    key: 'save',
    icon: 'wallet-outline',
    title: 'Save Money',
    subtitle: 'See how much you save doing DIY versus shop prices',
  },
  {
    key: 'wrenchy',
    icon: 'hardware-chip-outline',
    title: 'Meet Wrenchy',
    subtitle: 'Your AI assistant that knows your car inside out',
  },
  {
    key: 'xp',
    icon: 'trending-up-outline',
    title: 'Level Up',
    subtitle: 'Earn XP, build streaks, and stay on top of maintenance',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length) setCurrentIndex(viewableItems[0].index ?? 0);
  }).current;

  const complete = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    await AsyncStorage.setItem(LEGACY_COMPLETE_KEY, 'true');
    router.replace('/login');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      complete();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon} size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={complete} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        scrollEventThrottle={32}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
            />
          );
        })}
      </View>

      {/* CTA Button */}
      <TouchableOpacity style={styles.ctaBtn} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.ctaText}>{isLast ? "Let's go" : 'Next'}</Text>
      </TouchableOpacity>

      <View style={{ height: SPACING.xxl }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: SPACING.xl,
    zIndex: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  skipText: {
    ...TYPE.body,
    color: COLORS.textMuted,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxxl,
  },
  title: {
    ...TYPE.displayMD,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    ...TYPE.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.amber,
  },
  ctaBtn: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.sm,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: COLORS.amberDark,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  ctaText: {
    ...TYPE.h2,
    color: COLORS.white,
    fontFamily: 'Outfit_700Bold',
  },
});
