import { useTranslation } from "react-i18next";

import HRTabs from "../components/hr/HRTabs";
import PageLayout from "../components/layout/PageLayout";

export default function HR() {
  const { t } = useTranslation();

  return (
    <PageLayout title={t("hr.title")} description={t("hr.description")}>
      <HRTabs />
    </PageLayout>
  );
}
