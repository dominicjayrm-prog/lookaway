import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/providers/ThemeProvider';
import { WORLD_THEMES, WORLD_THEME_ORDER } from '@/src/data/unifiedJourney';
import { CAMPAIGNS, CAMPAIGN_ORDER } from '@/src/data/campaigns';

interface Props {
  onComplete: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Three-card swipeable intro shown to brand-new accounts. Tapping the
 *  final CTA sets `hasSeenUnifiedIntro = true` and boots them into
 *  Level 1. Existing users see a dismissible banner instead (handled in
 *  the Journey screen). */
export function UnifiedIntro({ onComplete }: Props) {
  const { colors } = useTheme();
  const [cardIdx, setCardIdx] = useState(0);
  const scrollRef = React.useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== cardIdx) setCardIdx(page);
  };

  const goNext = () => {
    if (cardIdx < 2) {
      scrollRef.current?.scrollTo({ x: (cardIdx + 1) * SCREEN_WIDTH, animated: true });
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={[st.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {/* Card 1 — the Journey */}
        <View style={[st.card, { width: SCREEN_WIDTH }]}>
          <Text style={[st.eyebrow, { color: colors.accent }]}>THE BRAIN JOURNEY</Text>
          <Text style={[st.bigNumber, { color: colors.accent }]}>380</Text>
          <Text style={[st.title, { color: colors.text }]}>Levels. One path.</Text>
          <Text style={[st.body, { color: colors.textMid }]}>
            No menus. No unlocks to chase. Just the next level, then the one after.
          </Text>
        </View>

        {/* Card 2 — the Modes */}
        <View style={[st.card, { width: SCREEN_WIDTH }]}>
          <Text style={[st.eyebrow, { color: colors.accent }]}>SIX WAYS TO TRAIN</Text>
          <Text style={[st.title, { color: colors.text }]}>Every mode, rotated</Text>
          <Text style={[st.body, { color: colors.textMid }]}>
            You'll taste each mode in the first 25 levels. No gatekeeping.
          </Text>
          <View style={st.modeGrid}>
            {CAMPAIGN_ORDER.map((id) => {
              const c = CAMPAIGNS[id];
              return (
                <View key={id} style={[st.modeChip, { backgroundColor: c.color + '15' }]}>
                  <View style={[st.modeDot, { backgroundColor: c.color }]} />
                  <Text style={[st.modeName, { color: c.color }]}>{c.name}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Card 3 — the Worlds */}
        <View style={[st.card, { width: SCREEN_WIDTH }]}>
          <Text style={[st.eyebrow, { color: colors.accent }]}>FIVE WORLDS TO EXPLORE</Text>
          <Text style={[st.title, { color: colors.text }]}>From forest to volcano</Text>
          <Text style={[st.body, { color: colors.textMid }]}>
            Each world has its own mood and look. Earn them by playing.
          </Text>
          <View style={st.worldColumn}>
            {WORLD_THEME_ORDER.map((theme) => {
              const meta = WORLD_THEMES[theme];
              return (
                <View key={theme} style={st.worldRow}>
                  <View style={[st.worldDot, { backgroundColor: meta.color }]} />
                  <Text style={[st.worldName, { color: colors.text }]}>{meta.name}</Text>
                  <Text style={[st.worldRange, { color: colors.textMid }]}>
                    {meta.range[0]}–{meta.range[1]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Pagination dots */}
      <View style={st.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              st.dot,
              {
                backgroundColor: i === cardIdx ? colors.accent : colors.borderStrong,
                width: i === cardIdx ? 20 : 6,
              },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={st.ctaContainer}>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            st.cta,
            { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={cardIdx < 2 ? 'Next' : 'Start Level 1'}
        >
          <LinearGradient
            colors={[colors.accent, colors.accent + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.ctaInner}
          >
            <Text style={st.ctaText}>
              {cardIdx < 2 ? 'Next' : 'Start Level 1'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  bigNumber: {
    fontSize: 80,
    fontWeight: '900',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeName: {
    fontSize: 13,
    fontWeight: '700',
  },
  worldColumn: {
    gap: 10,
    marginTop: 8,
    width: '100%',
    maxWidth: 280,
  },
  worldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  worldDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  worldName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  worldRange: {
    fontSize: 12,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  ctaContainer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  cta: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  ctaInner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
