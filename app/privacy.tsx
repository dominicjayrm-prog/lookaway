import { LegalViewer } from '@/src/components/LegalViewer';
import { t } from '@/src/i18n';

export default function PrivacyScreen() {
  return <LegalViewer url="https://playblanked.com/privacy" title={t('legal.privacy_title')} />;
}
