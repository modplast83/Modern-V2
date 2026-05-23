import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { AlertTriangle, CalendarDays, Clock, ExternalLink, Timer } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface WithdrawalRow {
  id: number;
  attendance_id: number;
  user_id: number;
  date: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  reason: string | null;
  previous_status: string | null;
  username: string | null;
  display_name: string | null;
  display_name_ar: string | null;
}

interface SummaryRow {
  user_id: number;
  username: string | null;
  display_name: string | null;
  display_name_ar: string | null;
  total_minutes: number;
  incident_count: number;
  violation_days: number;
}

interface DetailResponse {
  withdrawals: WithdrawalRow[];
  summary: SummaryRow[];
  startDate: string;
  endDate: string;
}

interface Props {
  employee: SummaryRow | null;
  startDate: string;
  endDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDuration(minutes: number): string {
  if (!minutes) return "0 د";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س ${m} د`;
}

function translateStatus(status: string | null): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    present: "حاضر",
    absent: "غائب",
    late: "متأخر",
    on_leave: "في إجازة",
    sick_leave: "إجازة مرضية",
    half_day: "نصف يوم",
    page_abandonment: "انسحاب من الصفحة",
  };
  return map[status] || status;
}

export default function EmployeeAbandonmentDetailDialog({
  employee,
  startDate,
  endDate,
  open,
  onOpenChange,
}: Props) {
  const enabled = open && !!employee;
  const { data, isLoading, isError } = useQuery<DetailResponse>({
    queryKey: [
      "/api/attendance/withdrawals",
      startDate,
      endDate,
      employee?.user_id,
    ],
    queryFn: async () => {
      const url = `/api/attendance/withdrawals?startDate=${startDate}&endDate=${endDate}&userId=${employee?.user_id}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل جلب البيانات");
      return res.json();
    },
    enabled,
  });

  const incidents = useMemo(
    () =>
      [...(data?.withdrawals || [])].sort((a, b) =>
        a.started_at < b.started_at ? 1 : -1,
      ),
    [data],
  );

  const dailyTotals = useMemo(() => {
    const map = new Map<
      string,
      { date: string; minutes: number; incidents: number }
    >();
    for (const w of data?.withdrawals || []) {
      const key = w.date;
      const cur = map.get(key) || { date: key, minutes: 0, incidents: 0 };
      cur.minutes += w.duration_minutes || 0;
      cur.incidents += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.date < b.date ? -1 : 1,
    );
  }, [data]);

  const summary = data?.summary?.[0];
  const empName =
    employee?.display_name_ar ||
    employee?.display_name ||
    employee?.username ||
    `#${employee?.user_id ?? ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            تفاصيل انسحاب الموظف: {empName}
          </DialogTitle>
          <DialogDescription className="text-right">
            من {startDate} إلى {endDate}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-10 text-gray-500">
            جاري التحميل...
          </div>
        ) : isError ? (
          <div className="text-center py-10 text-red-500">
            تعذر جلب البيانات
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Clock className="w-7 h-7 text-purple-500" />
                  <div>
                    <div className="text-xl font-bold">
                      {formatDuration(summary?.total_minutes || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      إجمالي الانسحاب
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Timer className="w-7 h-7 text-teal-500" />
                  <div>
                    <div className="text-xl font-bold">
                      {summary?.incident_count || 0}
                    </div>
                    <div className="text-xs text-gray-500">عدد الفترات</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                  <div>
                    <div className="text-xl font-bold">
                      {summary?.violation_days || 0}
                    </div>
                    <div className="text-xs text-gray-500">أيام مخالفة</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <CalendarDays className="w-7 h-7 text-blue-500" />
                  <div>
                    <div className="text-xl font-bold">
                      {dailyTotals.length}
                    </div>
                    <div className="text-xs text-gray-500">أيام بها انسحاب</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm font-semibold mb-2">
                  إجمالي الدقائق اليومية
                </div>
                {dailyTotals.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    لا توجد بيانات
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer>
                      <BarChart data={dailyTotals}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) =>
                            format(new Date(d), "MM/dd", { locale: ar })
                          }
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(d) =>
                            format(new Date(d as string), "yyyy/MM/dd", {
                              locale: ar,
                            })
                          }
                          formatter={(v: any) => [`${v} د`, "الدقائق"]}
                        />
                        <Bar dataKey="minutes" fill="#a855f7" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm font-semibold mb-2">
                  الخط الزمني الكامل للفترات
                </div>
                {incidents.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    لا توجد سجلات
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">بدأ</TableHead>
                          <TableHead className="text-right">انتهى</TableHead>
                          <TableHead className="text-right">المدة</TableHead>
                          <TableHead className="text-right">
                            حالة الحضور
                          </TableHead>
                          <TableHead className="text-right">
                            سجل الحضور
                          </TableHead>
                          <TableHead className="text-right">السبب</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incidents.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>
                              {format(new Date(w.date), "yyyy/MM/dd", {
                                locale: ar,
                              })}
                            </TableCell>
                            <TableCell>
                              {format(new Date(w.started_at), "HH:mm:ss")}
                            </TableCell>
                            <TableCell>
                              {w.ended_at
                                ? format(new Date(w.ended_at), "HH:mm:ss")
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  (w.duration_minutes || 0) > 30
                                    ? "text-red-600 font-semibold"
                                    : ""
                                }
                              >
                                {formatDuration(w.duration_minutes || 0)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {translateStatus(w.previous_status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/hr?tab=attendance&userId=${w.user_id}&date=${w.date}&attendanceId=${w.attendance_id}`}
                                data-testid={`link-attendance-${w.attendance_id}`}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                title="فتح سجل الحضور"
                              >
                                <ExternalLink className="w-3 h-3" />
                                #{w.attendance_id}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {w.reason || "page_abandonment"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
