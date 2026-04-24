import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CAMPAIGNS, CAMPAIGN_ORDER, type Campaign } from '@/src/data/campaigns';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { t } from '@/src/i18n';

const SIDE_PREFIX: Record<string, string> = {
  speed_recall: 'sr',
  snap_match: 'sm',
  sequence: 'seq',
  counting_blitz: 'cb',
  colour_chain: 'cc',
};

interface Props {
  sideCampaignProgress: Record<string, { stars: number; best_score: number }>;
}

/** Mode Library — compact grid of all six modes for players who want to
 *  grind one at a time. Each card has its mode accent as a left stripe
 *  and a gradient progress bar. Tapping routes to the existing per-mode
 *  world map. Light haptic on tap. */
export function ModeLibrary({ sideCampaignProgress }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { levelProgress } = useGameStore();

  const openMode = (campaign: Campaign) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (campaign.id === 'classic') {
      router.push('/world/1');
      return;
    }
    router.push({
      pathname: '/world/side-world',
      params: {
        mode: campaign.id,
        worldNumber: '1',
        worldName: campaign.worldNames[0] ?? '',
      },
    });
  };

  const computeCompleted = (c: Campaign) => {
    let completed = 0;
    if (c.id === 'classic') {
      c.levelsPerWorld.forEach((count, i) => {
        for (let l = 1; l <= count; l++) {
          const p = levelProgress[`w${i + 1}-l${l}`];
          if (p && p.stars > 0) completed++;
        }
      });
    } else {
      const prefix = SIDE_PREFIX[c.id] ?? c.id;
      c.levelsPerWorld.forEach((count, i) => {
        for (let l = 1; l <= count; l++) {
          const p = sideCampaignProgress[`${prefix}_w${i + 1}_l${l}`];
          if (p && p.stars > 0) completed++;
        }
      });
    }
    return completed;
  };

  return (
    <View style={st.container}>
      <View style={st.headerRow}>
        <View style={st.headerLeft}>
          <Text style={[st.heading, { color: colors.text }]}>
            {t('journey.mode_library_title')}
          </Text>
          <Text style={[st.subheading, { color: colors.textMid }]}>
            {t('journey.mode_library_sub')}
          </Text>
        </View>
      </View>

      <View style={st.grid}>
        {CAMPAIGN_ORDER.map((id) => {
          const c = CAMPAIGNS[id];
          const completed = computeCompleted(c);
          const pct = Math.round((completed / c.totalLevels) * 100);
          return (
            <Pressable
              key={id}
              onPress={() => openMode(c)}
              style={({ pressed }) => [
                st.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${pct}% complete`}
            >
              <View style={[st.stripe, { backgroundColor: c.color }]} />
              <View style={st.cardBody}>
                <View style={st.cardHeader}>
                  <Text style={[st.cardName, { color: colors.text }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={[st.cardPct, { color: c.color }]}>{pct}%</Text>
                </View>
                <Text style={[st.cardMastered, { color: colors.textMid }]}>
                  {t('journey.mastered')}
                </Text>
                <View style={[st.progressTrack, { backgroundColor: colors.surface }]}>
                  <LinearGradient
                    colors={[c.color, c.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[st.progressFill, { width: `${Math.max(3, pct)}%` }]}
                  />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 36,
  },
  headerRow: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  stripe: {
    width: 3,
    alignSelf: 'stretch',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginRight: 4,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  cardPct: {
    fontSize: 12,
    fontWeight: '900',
  },
  cardMastered: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
