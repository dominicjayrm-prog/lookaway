import { LegalViewer } from '@/src/components/LegalViewer';
import { t } from '@/src/i18n';

export default function PrivacyScreen() {
  return <LegalViewer url={t('legal.privacy_url')} title={t('legal.privacy_title')} />;
}
