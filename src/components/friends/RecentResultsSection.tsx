import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { borderRadius } from '@/src/theme/spacing';
import { SectionLabel } from './SectionLabel';
import type { Challenge } from '@/src/utils/friends';

interface RecentResultsSectionProps {
  results: Challenge[];
  onSelectResult: (challengeId: string) => void;
}

/**
 * "LAST 3 RESULTS" list — shows the most recent finished challenges
 * with a W/L/T badge. Returns null when empty so the parent can mount
 * unconditionally.
 */
export function RecentResultsSection({ results, onSelectResult }: RecentResultsSectionProps) {
  const { colors } = useTheme();
  if (results.length === 0) return null;

  return (
    <>
      <SectionLabel label="LAST 3 RESULTS" />
      {results.map((r) => {
        const won = (r.my_score ?? 0) > (r.their_score ?? 0);
        const tied = r.my_score === r.their_score;
        const outcome = tied ? 'T' : won ? 'W' : 'L';
        const badgeBg = tied ? colors.goldSoft : won ? colors.correctSoft : colors.wrongSoft;
        const badgeColor = tied ? colors.gold : won ? colors.correct : colors.wrong;

        return (
          <Pressable
            key={r.id}
            style={[styles.resultCard, { backgroundColor: colors.card }]}
            onPress={() => onSelectResult(r.id)}
            accessibilityRole="button"
            accessibilityLabel={`View challenge result against ${r.opponent.username}`}
          >
            <View style={[styles.resultBadge, { backgroundColor: badgeBg }]}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: badgeColor }}>{outcome}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                vs @{r.opponent.username}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMid }}>
                {r.my_score}% — {r.their_score}%
              </Text>
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  resultBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
