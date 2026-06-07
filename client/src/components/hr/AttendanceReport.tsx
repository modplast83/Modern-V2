import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "../../contexts/LanguageContext";

function monthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const first = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const last = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { first, last };
}

export default function AttendanceReport() {
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const { first, last } = monthRange();
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(last);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ["/api/hr/attendance/report", { from, to }],
    enabled: !!from && !!to,
  });

  const rows = data?.data ?? [];

  const empName = (e: any) =>
    (isRTL ? e.display_name_ar : e.display_name) ||
    e.display_name ||
    e.username;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiRequest(
        `/api/hr/attendance/report/export?from=${encodeURIComponent(
          from,
        )}&to=${encodeURIComponent(to)}`,
      );
      if (!res.ok) {
        throw new Error(L("فشل التصدير", "Export failed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${from}_${to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: L("خطأ", "Error"),
        description: e.message || L("فشل التصدير", "Export failed"),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>{L("تقرير الحضور", "Attendance Report")}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="w-auto"
              data-testid="input-report-from"
            />
            <span className="text-gray-400">—</span>
            <Input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="w-auto"
              data-testid="input-report-to"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={exporting || rows.length === 0}
              data-testid="button-export-report"
            >
              <Download className="h-4 w-4 ml-1" />
              {exporting ? L("جارٍ التصدير...", "Exporting...") : L("تصدير", "Export")}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            {L("لا توجد بيانات للفترة المحددة", "No data for selected period")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L("الموظف", "Employee")}</TableHead>
                  <TableHead>{L("القسم", "Section")}</TableHead>
                  <TableHead>{L("مجدول", "Scheduled")}</TableHead>
                  <TableHead>{L("حضور", "Present")}</TableHead>
                  <TableHead>{L("غياب", "Absent")}</TableHead>
                  <TableHead>{L("غير مكتمل", "Incomplete")}</TableHead>
                  <TableHead>{L("تأخير(د)", "Late(m)")}</TableHead>
                  <TableHead>{L("عمل(س)", "Worked(h)")}</TableHead>
                  <TableHead>{L("إضافي(س)", "OT(h)")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow
                    key={r.employee.id}
                    data-testid={`row-report-${r.employee.id}`}
                  >
                    <TableCell className="font-medium">
                      {empName(r.employee)}
                    </TableCell>
                    <TableCell>
                      {(isRTL
                        ? r.employee.section_name_ar
                        : r.employee.section_name) ||
                        r.employee.section_name ||
                        "—"}
                    </TableCell>
                    <TableCell>{r.totals.scheduledDays}</TableCell>
                    <TableCell className="text-green-700">
                      {r.totals.presentDays}
                    </TableCell>
                    <TableCell className="text-red-700">
                      {r.totals.absentDays}
                    </TableCell>
                    <TableCell className="text-amber-700">
                      {r.totals.incompleteDays}
                    </TableCell>
                    <TableCell>{r.totals.totalLateMinutes}</TableCell>
                    <TableCell>{r.totals.totalWorkedHours}</TableCell>
                    <TableCell className="text-indigo-700">
                      {r.totals.totalOvertimeHours}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
