/**
 * RootErrorBoundary — catches uncaught render-phase errors anywhere
 * in the React tree and shows a polite recovery screen instead of
 * crashing to a white screen.
 *
 * Why this matters for App Store review:
 * Reviewers test on freshly-installed devices, devices with corrupted
 * AsyncStorage caches, and devices on flaky networks. If any startup
 * code throws — bad JSON parse, missing native module, undefined
 * cosmetic id — without a boundary the user sees a blank white
 * screen and the app is rejected for "crashes on launch".
 *
 * The boundary deliberately stays simple:
 *  - No theming (might be the broken thing)
 *  - No store reads (same)
 *  - Just a plain dark screen + restart button + the error message
 *    in dev so the user can copy-paste it to support
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

export class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Best-effort log. Don't import the project logger here in case
    // it's the thing that's broken.
    // eslint-disable-next-line no-console
    console.error('[RootErrorBoundary]', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    // Before the App Store submission goes out we gate this on __DEV__
    // again — but during active TestFlight beta it's hugely valuable
    // to see the actual error message on-device so testers can screenshot
    // it. "Something went wrong" alone is useless for diagnosis. The
    // message is shown in a subtle grey box below the body copy.
    const errMsg = String(this.state.error?.message ?? this.state.error);
    const errStack = this.state.error?.stack ? String(this.state.error.stack).split('\n').slice(0, 3).join('\n') : '';

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Blanked hit an unexpected error. Tap below to try again. If this keeps
          happening, email hello@playblanked.com and we'll fix it for you.
        </Text>
        <View style={styles.devBox}>
          <Text style={styles.devText} selectable>{errMsg}</Text>
          {errStack ? <Text style={styles.devStack} selectable>{errStack}</Text> : null}
        </View>
        <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F7F6F3' },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A18', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, color: '#636E72', textAlign: 'center', marginBottom: 24, maxWidth: 320 },
  devBox: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 16, maxWidth: 360, borderWidth: 1, borderColor: '#EDEBE6' },
  devText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#FF6B6B', lineHeight: 16 },
  devStack: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#B2BEC3', lineHeight: 14, marginTop: 6 },
  button: { backgroundColor: '#6C5CE7', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
