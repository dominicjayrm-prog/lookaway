import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { OptionButton } from './OptionButton';
import { colors } from '@/src/theme/colors';
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
}

export const QuestionCard = React.memo(function QuestionCard({
  questionText,
  options,
  selectedIndex,
  revealedCorrectIndex,
  onSelect,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
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
      <Text style={styles.counter}>
        QUESTION {questionNumber} OF {totalQuestions}
      </Text>
      <Text style={styles.question}>{questionText}</Text>
      <View style={styles.options}>
        {options.map((option, index) => (
          <OptionButton
            key={index}
            label={option}
            state={getOptionState(index)}
            onPress={() => onSelect(index)}
            disabled={selectedIndex !== null}
          />
        ))}
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
    color: colors.textLight,
    letterSpacing: 1,
  },
  question: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    lineHeight: 28,
  },
  options: {
    gap: spacing.sm,
  },
});
