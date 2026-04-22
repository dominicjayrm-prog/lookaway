import { LegalViewer } from '@/src/components/LegalViewer';
import { t } from '@/src/i18n';

// Apple's standard EULA — the same agreement declared in App Store
// Connect under App Information → License Agreement. The subscription
// paywall links here so the in-app "Terms of Use (EULA)" link matches
// the EULA Apple sees on the store listing (Apple guideline 3.1.2(c)).
//
// URL + title both resolve via i18n. Apple publishes the standard
// EULA in country-specific copies; Spanish users get the Spanish
// translation at .../itunes/es/stdeula/ so nobody is asked to agree
// to legalese they can't read.
export default function EulaScreen() {
  return <LegalViewer url={t('legal.eula_url')} title={t('legal.eula_title')} />;
}
