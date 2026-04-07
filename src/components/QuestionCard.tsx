import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { OptionButton } from './OptionButton';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

type OptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed';

interface QuestionCardProps {
  questionText: string;
  options: string[];
  selectedIndex: number | null;
  revealedCorrectIndex: number | null;
  onSelect: (index: number) => void;
  questionNumber: number;
  totalQuestions: number;
  hiddenOptions?: number[];
}

export const QuestionCard = React.memo(function QuestionCard({
  questionText,
  options,
  selectedIndex,
  revealedCorrectIndex,
  onSelect,
  questionNumber,
  totalQuestions,
  hiddenOptions = [],
}: QuestionCardProps) {
  const { colors } = useTheme();

  const getOptionState = (index: number): OptionState => {
    if (revealedCorrectIndex === null) {
      return index === selectedIndex ? 'selected' : 'default';
    }
    if (index === revealedCorrectIndex) return 'correct';
    if (index === selectedIndex && selectedIndex !== revealedCorrectIndex) return 'wrong';
    return 'dimmed';
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.counter, { color: colors.textLight }]}>
        QUESTION {questionNumber} OF {totalQuestions}
      </Text>
      <Text style={[styles.question, { color: colors.text }]}>{questionText}</Text>
      <View style={styles.options}>
        {options.map((option, index) => {
          const isHidden = hiddenOptions.includes(index);
          return (
            <OptionButton
              key={index}
              label={option}
              index={index}
              state={isHidden ? 'dimmed' : getOptionState(index)}
              onPress={() => onSelect(index)}
              disabled={selectedIndex !== null || isHidden}
              style={undefined}
            />
          );
        })}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  counter: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  question: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    lineHeight: 28,
  },
  options: {
    gap: spacing.sm,
  },
});
