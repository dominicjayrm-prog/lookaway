import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

/** Mode Library — a compact card per mode for players who want to grind
 *  one mode at a time. Tapping a card routes to the existing per-mode
 *  world map. Unified ladder progression happens on the journey path
 *  above; this surface is independent. */
export function ModeLibrary({ sideCampaignProgress }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const { levelProgress } = useGameStore();

  const openMode = (campaign: Campaign) => {
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
        <Text style={[st.heading, { color: colors.text }]}>
          {t('journey.mode_library_title')}
        </Text>
        <Text style={[st.subheading, { color: colors.textMid }]}>
          {t('journey.mode_library_sub')}
        </Text>
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
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${pct}% complete`}
            >
              <View style={[st.dot, { backgroundColor: c.color }]} />
              <View style={st.cardBody}>
                <Text style={[st.cardName, { color: colors.text }]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={[st.cardMastered, { color: colors.textMid }]}>
                  {pct}% {t('journey.mastered')}
                </Text>
                <View style={[st.progressTrack, { backgroundColor: colors.surface }]}>
                  <View
                    style={[
                      st.progressFill,
                      { backgroundColor: c.color, width: `${Math.max(3, pct)}%` },
                    ]}
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerRow: {
    marginBottom: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 12,
    marginTop: 2,
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
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardMastered: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
