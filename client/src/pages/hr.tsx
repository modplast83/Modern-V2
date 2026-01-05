import { useTranslation } from 'react-i18next';
import PageLayout from "../components/layout/PageLayout";
import HRTabs from "../components/hr/HRTabs";

export default function HR() {
  const { t } = useTranslation();
  
  return (
    <PageLayout title={t('hr.title')} description={t('hr.attendance')}>
      <HRTabs />
    </PageLayout>
  );
}
