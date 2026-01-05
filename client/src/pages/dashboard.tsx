import { useTranslation } from 'react-i18next';
import PageLayout from "../components/layout/PageLayout";
import DashboardStats from "../components/dashboard/DashboardStats";
import Shortcuts from "../components/dashboard/Shortcuts";
import QuickNotes from "../components/dashboard/QuickNotes";

export default function Dashboard() {
  const { t } = useTranslation();
  
  return (
    <PageLayout title={t('dashboard.title')} description={t('dashboard.productionOverview')}>
      <div className="space-y-6">
        <Shortcuts />
        <DashboardStats />
        <QuickNotes />
      </div>
    </PageLayout>
  );
}
