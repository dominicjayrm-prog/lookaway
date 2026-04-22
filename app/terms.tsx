import { LegalViewer } from '@/src/components/LegalViewer';
import { t } from '@/src/i18n';

export default function TermsScreen() {
  return <LegalViewer url={t('legal.terms_url')} title={t('legal.terms_title')} />;
}
