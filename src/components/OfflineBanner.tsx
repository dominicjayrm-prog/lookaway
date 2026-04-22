import { t } from '@/src/i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

function useIsOffline(): boolean {
  var [offline, setOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: use navigator.onLine
      setOffline(!navigator.onLine);
      var onOnline = () => setOffline(false);
      var onOffline = () => setOffline(true);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
    } else {
      // Native: use NetInfo
      try {
        var NetInfo = require('@react-native-community/netinfo').default;
        var unsubscribe = NetInfo.addEventListener((state: any) => {
          setOffline(!state.isConnected);
        });
        return () => unsubscribe();
      } catch {
        return undefined;
      }
    }
  }, []);

  return offline;
}

function OfflineBanner() {
  var offline = useIsOffline();
  if (!offline) return null;

  return (
    <View style={st.banner}>
      <View style={st.dot} />
      <Text style={st.text}>{t('game_indicators.offline_banner')}</Text>
    </View>
  );
}

export default OfflineBanner;
export { useIsOffline };

var st = StyleSheet.create({
  banner: {
    backgroundColor: '#636E72',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  text: {
    fontSize: 12, color: '#FFFFFF', fontWeight: '600',
  },
});
