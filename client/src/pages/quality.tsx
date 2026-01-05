import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import PageLayout from "../components/layout/PageLayout";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { formatNumber, formatPercentage } from "../lib/formatNumber";

export default function Quality() {
  const { t } = useTranslation();
  const { data: qualityChecks, isLoading } = useQuery({
    queryKey: ["/api/quality-checks"],
  });

  const getStatusIcon = (result: string) => {
    switch (result) {
      case "pass":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "fail":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (result: string) => {
    switch (result) {
      case "pass":
        return t('quality.passed');
      case "fail":
        return t('quality.failed');
      case "warning":
        return "تحذير";
      default:
        return "قيد الانتظار";
    }
  };

  return (
    <PageLayout title={t('quality.title')} description={t('quality.inspection')}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t('quality.inspection')}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(
                        Array.isArray(qualityChecks) ? qualityChecks.length : 0,
                      )}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t('quality.passed')}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatNumber(
                        Array.isArray(qualityChecks)
                          ? qualityChecks.filter(
                              (q: any) => q.result === "pass",
                            ).length
                          : 0,
                      )}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t('quality.failed')}
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatNumber(
                        Array.isArray(qualityChecks)
                          ? qualityChecks.filter(
                              (q: any) => q.result === "fail",
                            ).length
                          : 0,
                      )}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t('quality.result')}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatPercentage(
                        Array.isArray(qualityChecks) && qualityChecks.length > 0
                          ? Math.round(
                              (qualityChecks.filter(
                                (q: any) => q.result === "pass",
                              ).length /
                                qualityChecks.length) *
                                100,
                            )
                          : 0,
                      )}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('quality.inspection')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('common.loading')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          رقم الرولة
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          نوع الفحص
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {t('quality.result')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {t('quality.remarks')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          المفتش
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {t('common.date')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(qualityChecks) ? (
                        qualityChecks.map((check: any) => (
                          <tr key={check.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {check.roll_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {check.check_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(check.result)}
                                <Badge
                                  variant={
                                    check.result === "pass"
                                      ? "default"
                                      : check.result === "fail"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {getStatusText(check.result)}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {check.notes || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {check.inspector_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(check.checked_at).toLocaleDateString(
                                "ar",
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            {t('common.noData')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
    </PageLayout>
  );
}
