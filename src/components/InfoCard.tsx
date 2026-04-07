/**
 * InfoCard — Contextual info card that appears when players tap UI elements.
 * Educates new players, reduces confusion, creates natural upsell moments.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Platform } from 'react-native';

interface InfoCardProps {
  visible: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
  accentColor?: string;
  action?: () => void;
  actionLabel?: string;
  onClose: () => void;
}

function InfoCardComponent({
  visible,
  icon,
  title,
  description,
  tip,
  accentColor = '#6C5CE7',
  action,
  actionLabel,
  onClose,
}: InfoCardProps) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(8)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      translateY.setValue(8);
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  const handleClose = () => {
    RNAnimated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      {/* Backdrop — tap to dismiss */}
      <Pressable style={st.backdrop} onPress={handleClose}>
        <RNAnimated.View
          style={[st.cardContainer, { opacity, transform: [{ translateY }], maxWidth: Platform.OS === 'web' ? 430 : undefined }]}
        >
          {/* Prevent card taps from dismissing */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Accent strip */}
            <View style={[st.strip, { backgroundColor: accentColor }]} />

            <View style={st.content}>
              {/* Header row */}
              <View style={st.header}>
                <View style={[st.iconCircle, { backgroundColor: `${accentColor}10` }]}>
                  {icon}
                </View>
                <View style={st.headerText}>
                  <Text style={st.title}>{title}</Text>
                  <Text style={st.description}>{description}</Text>
                </View>
                <Pressable onPress={handleClose} style={st.closeBtn}>
                  <Text style={st.closeX}>{'\u2715'}</Text>
                </Pressable>
              </View>

              {/* Tip row */}
              {tip && (
                <View style={[st.tipBox, { backgroundColor: `${accentColor}06` }]}>
                  <Text style={st.tipBulb}>{'\uD83D\uDCA1'}</Text>
                  <Text style={[st.tipText, { color: accentColor }]}>{tip}</Text>
                </View>
              )}

              {/* Action button */}
              {action && actionLabel && (
                <Pressable onPress={() => { action(); handleClose(); }} style={[st.actionBtn, { backgroundColor: accentColor }]}>
                  <Text style={st.actionText}>{actionLabel}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
}

export const InfoCard = React.memo(InfoCardComponent);

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cardContainer: {
    alignSelf: 'center',
    width: '100%',
    borderRadius: 20,
    backgroundColor: 'white',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  strip: {
    height: 3,
  },
  content: {
    padding: 16,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A18',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#636E72',
    lineHeight: 18,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5F4F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  closeX: {
    fontSize: 12,
    color: '#B2BEC3',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  tipBulb: {
    fontSize: 11,
  },
  tipText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    flex: 1,
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
});
