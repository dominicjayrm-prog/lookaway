/**
 * ReportUserModal — reason picker + optional details, submits to the
 * user_reports table via reportUser(). Used from the friend profile
 * popup so players can flag another user for review.
 *
 * UX notes:
 *  - Radio-style list of the 5 reasons with one-line descriptions
 *  - Optional details TextInput (80 chars max — we don't want essays)
 *  - Disabled Submit until a reason is selected
 *  - Shows a clear success / already-reported / failure toast via
 *    Alert.alert on both native and web (web uses our fallback)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { reportUser, REPORT_REASONS, type ReportReason } from '@/src/utils/reportUser';
import { blockUser } from '@/src/utils/blockUser';

interface Props {
  visible: boolean;
  reporterId: string | undefined;
  reportedId: string;
  reportedUsername?: string;
  onClose: () => void;
}

function notify(title: string, message?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Alert.alert on RN-web is unreliable for multi-step dialogs, so
    // use the native confirm/alert fallback.
    (window as any).alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function ReportUserModal({ visible, reporterId, reportedId, reportedUsername, onClose }: Props) {
  const { colors } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // "Also block" defaults ON because in practice if someone is
  // worth reporting they're worth not seeing again. User can toggle
  // off if they're reporting a bug/spam that they don't mind
  // encountering again (rare).
  const [alsoBlock, setAlsoBlock] = useState(true);

  function reset() {
    setReason(null);
    setDetails('');
    setAlsoBlock(true);
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!reporterId || !reason) return;
    setSubmitting(true);
    const result = await reportUser(reporterId, reportedId, reason, details);
    // If the report landed (or was a duplicate of an existing one)
    // and the user opted to also block, fire the block in the
    // background. We don't block the UI on its result — the block
    // is best-effort and shouldn't derail the report success path.
    if ((result.ok || result.alreadyReported) && alsoBlock) {
      blockUser(reporterId, reportedId).catch(() => {});
    }
    setSubmitting(false);

    if (result.ok) {
      const msg = alsoBlock
        ? "Thanks — our team will review this. The user has been blocked and will no longer be able to reach you."
        : "Thanks — our team will review this. The user has not been notified.";
      notify('Report submitted', msg);
      reset();
      onClose();
    } else if (result.alreadyReported) {
      notify('Already reported', result.message);
      reset();
      onClose();
    } else {
      notify('Could not submit', result.message ?? 'Please try again later.');
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={handleClose} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.wrongSoft }]}>
              <Ionicons name="flag-outline" size={22} color={colors.wrong} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Report user</Text>
            <Text style={[styles.subtitle, { color: colors.textMid }]}>
              {reportedUsername ? `Why are you reporting @${reportedUsername}?` : 'Why are you reporting this user?'}
            </Text>
          </View>

          <ScrollView style={styles.reasonsScroll} showsVerticalScrollIndicator={false}>
            {REPORT_REASONS.map((r) => {
              const selected = reason === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setReason(r.id)}
                  style={[
                    styles.reasonRow,
                    { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accentSoft : 'transparent' },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={r.label}
                >
                  <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.borderStrong }]}>
                    {selected && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reasonLabel, { color: colors.text }]}>{r.label}</Text>
                    <Text style={[styles.reasonDesc, { color: colors.textLight }]}>{r.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            value={details}
            onChangeText={(t) => setDetails(t.slice(0, 200))}
            placeholder="Optional details (max 200 chars)"
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={200}
            style={[styles.detailsInput, { backgroundColor: colors.surface, color: colors.text }]}
          />

          <Pressable
            onPress={() => setAlsoBlock((v) => !v)}
            style={[styles.blockToggle, { borderColor: colors.border, backgroundColor: alsoBlock ? colors.wrongSoft : 'transparent' }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: alsoBlock }}
            accessibilityLabel="Also block this user"
          >
            <View style={[styles.checkbox, { borderColor: alsoBlock ? colors.wrong : colors.borderStrong, backgroundColor: alsoBlock ? colors.wrong : 'transparent' }]}>
              {alsoBlock && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.blockToggleLabel, { color: colors.text }]}>Also block this user</Text>
              <Text style={[styles.blockToggleDesc, { color: colors.textLight }]}>
                They won't be able to send friend requests or challenges. You can unblock anytime from your profile.
              </Text>
            </View>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleClose}
              style={[styles.btn, { backgroundColor: colors.surface }]}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel report"
            >
              <Text style={[styles.btnText, { color: colors.textMid }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!reason || submitting}
              style={[
                styles.btn,
                { backgroundColor: colors.wrong, opacity: !reason || submitting ? 0.5 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Submit report"
            >
              <Text style={styles.btnText}>{submitting ? 'Sending…' : 'Submit report'}</Text>
            </Pressable>
          </View>

          <Text style={[styles.footer, { color: colors.textLight }]}>
            The user you're reporting will not be notified. Our team reviews reports within 24 hours.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  card: { width: '100%', maxWidth: 380, maxHeight: '88%', borderRadius: 22, padding: 20 },
  header: { alignItems: 'center', marginBottom: 14 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  reasonsScroll: { maxHeight: 320, marginBottom: 10 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  reasonLabel: { fontSize: 14, fontWeight: '700' },
  reasonDesc: { fontSize: 12, marginTop: 1 },
  detailsInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
  blockToggle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  blockToggleLabel: { fontSize: 13, fontWeight: '700' },
  blockToggleDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  actionRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 15 },
});
