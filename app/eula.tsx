import { LegalViewer } from '@/src/components/LegalViewer';

// Apple's standard EULA — the same agreement declared in App Store
// Connect under App Information → License Agreement. The subscription
// paywall links here so the in-app "Terms of Use (EULA)" link matches
// the EULA Apple sees on the store listing (Apple guideline 3.1.2(c)).
export default function EulaScreen() {
  return (
    <LegalViewer
      url="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
      title="Terms of Use (EULA)"
    />
  );
}
