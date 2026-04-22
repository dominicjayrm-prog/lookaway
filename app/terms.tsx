import { LegalViewer } from '@/src/components/LegalViewer';
import { t } from '@/src/i18n';

export default function TermsScreen() {
  return <LegalViewer url="https://playblanked.com/terms" title={t('legal.terms_title')} />;
}
