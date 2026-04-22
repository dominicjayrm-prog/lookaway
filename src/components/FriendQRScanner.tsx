/**
 * FriendQRScanner — full-screen modal that opens the camera and scans
 * for a Blanked invite QR code. On successful scan it runs the URL
 * through `parseInviteUrl` and calls `addFriendById`, surfacing the
 * result via an `Alert`.
 *
 * State machine:
 *   permission pending → granted → SCANNING → (detected) → PROCESSING
 *                                           → (handled)  → SCANNING | CLOSE
 *                     → denied  → PERMISSION_DENIED (with "Open Settings")
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/src/i18n';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Linking,
  Platform,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { parseInviteUrl } from '@/src/utils/deepLinks';
import { addFriendById } from '@/src/utils/friends';

const { width: SW, height: SH } = Dimensions.get('window');
const FRAME_SIZE = Math.min(SW * 0.72, 280);
// After a single scan we pause for this long before accepting another
// barcode frame — prevents the same QR from firing the handler dozens of
// times while the camera sees it.
const SCAN_COOLDOWN_MS = 2000;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** Called after a successful friend add so the parent can refresh its
   *  friends list without waiting for the next tab focus. */
  onFriendAdded?: () => void;
}

export function FriendQRScanner({ visible, onDismiss, onFriendAdded }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const myId = user?.id;
  const [permission, requestPermission] = useCameraPermissions();

  // Guard against the camera firing `onBarcodeScanned` dozens of times
  // per second while a QR is visible. We latch on the first hit and
  // release after SCAN_COOLDOWN_MS (or after the modal closes).
  const lockedRef = useRef(false);
  const [processing, setProcessing] = useState(false);
  const [hintText, setHintText] = useState('Point the camera at a friend\u2019s QR code');

  // Animated subtle scan line bouncing inside the frame.
  const scanLineY = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(scanLineY, { toValue: FRAME_SIZE - 4, duration: 1800, useNativeDriver: true }),
        RNAnimated.timing(scanLineY, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, scanLineY]);

  // Auto-request permission the first time the modal opens.
  useEffect(() => {
    if (!visible) return;
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // Reset scan lock when the modal opens so a previously-scanned QR
    // can be scanned again.
    lockedRef.current = false;
    setProcessing(false);
    setHintText('Point the camera at a friend\u2019s QR code');
  }, [visible, permission, requestPermission]);

  const handleClose = useCallback(() => {
    lockedRef.current = true; // prevent any in-flight scan from firing after close
    onDismiss();
  }, [onDismiss]);

  const handleBarcode = useCallback(
    async (result: BarcodeScanningResult) => {
      if (lockedRef.current || processing || !myId) return;
      const data = result?.data;
      if (!data) return;
      lockedRef.current = true;
      setProcessing(true);

      const inviteId = parseInviteUrl(data);
      if (!inviteId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setHintText('That\u2019s not a Blanked invite code');
        setTimeout(() => {
          lockedRef.current = false;
          setProcessing(false);
          setHintText('Point the camera at a friend\u2019s QR code');
        }, SCAN_COOLDOWN_MS);
        return;
      }

      if (inviteId === myId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        Alert.alert('That\u2019s your own QR 😄', 'Show it to a friend so they can scan it.', [
          { text: 'OK', onPress: handleClose },
        ]);
        return;
      }

      const outcome = await addFriendById(myId, inviteId);
      switch (outcome) {
        case 'sent':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onFriendAdded?.();
          Alert.alert('Request sent!', 'They will see your request in their Friends tab.', [
            { text: 'Nice', onPress: handleClose },
          ]);
          break;
        case 'already_friends':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          Alert.alert('Already friends', 'You\u2019re already connected with this player.', [
            { text: 'OK', onPress: handleClose },
          ]);
          break;
        case 'request_pending':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          Alert.alert('Request pending', 'A friend request between you two is already waiting.', [
            { text: 'OK', onPress: handleClose },
          ]);
          break;
        case 'self':
          Alert.alert('That\u2019s your own QR 😄', undefined, [{ text: 'OK', onPress: handleClose }]);
          break;
        case 'error':
        default:
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          Alert.alert('Couldn\u2019t send request', 'Check your connection and try again.', [
            {
              text: 'Try again',
              onPress: () => {
                lockedRef.current = false;
                setProcessing(false);
                setHintText('Point the camera at a friend\u2019s QR code');
              },
            },
            { text: 'Cancel', style: 'cancel', onPress: handleClose },
          ]);
          break;
      }
    },
    [myId, processing, handleClose, onFriendAdded],
  );

  if (!visible) return null;

  const permissionLoading = !permission;
  const permissionDenied = permission && !permission.granted;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={st.root}>
        {/* Camera feed — only mount when granted so we don't trigger the
            permission prompt more than once per open. */}
        {permission?.granted && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcode}
          />
        )}

        {/* Dim underlay — dark behind the camera so the frame pops. */}
        {!permission?.granted && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]} />}

        {/* Targeting frame overlay */}
        {permission?.granted && (
          <View style={st.overlay} pointerEvents="none">
            <View style={[st.frame, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
              <View style={[st.corner, st.cornerTL]} />
              <View style={[st.corner, st.cornerTR]} />
              <View style={[st.corner, st.cornerBL]} />
              <View style={[st.corner, st.cornerBR]} />
              <RNAnimated.View
                style={[
                  st.scanLine,
                  { transform: [{ translateY: scanLineY }] },
                ]}
              />
            </View>
            <Text style={st.hint}>{hintText}</Text>
          </View>
        )}

        {/* Permission denied state */}
        {permissionDenied && (
          <View style={st.permissionCard}>
            <View style={[st.permissionInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="camera-outline" size={32} color={colors.accent} />
              <Text style={[st.permTitle, { color: colors.text }]}>{t('modals.camera_needed')}</Text>
              <Text style={[st.permBody, { color: colors.textMid }]}>
                {'Blanked needs camera access so you can scan a friend\u2019s QR code. You can enable it in Settings.'}
              </Text>
              <Pressable
                onPress={() => Linking.openSettings()}
                style={[st.permBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={st.permBtnText}>{t('modals.open_settings')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Loading permission placeholder */}
        {permissionLoading && (
          <View style={st.permissionCard}>
            <Text style={{ color: '#FFFFFF' }}>Loading camera…</Text>
          </View>
        )}

        {/* Close button — always on top */}
        <SafeAreaView style={st.closeWrap} edges={['top']} pointerEvents="box-none">
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={st.closeBtn}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: 'rgba(108,92,231,0.9)',
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  hint: {
    position: 'absolute',
    bottom: SH * 0.18,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionInner: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
    maxWidth: 320,
  },
  permTitle: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  permBody: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  permBtn: { marginTop: 12, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  closeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
