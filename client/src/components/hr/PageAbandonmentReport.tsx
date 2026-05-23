import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  AlertTriangle,
  Clock,
  Users,
  Search,
  Download,
  Timer,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../ui/card";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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

interface WithdrawalsResponse {
  withdrawals: WithdrawalRow[];
  summary: SummaryRow[];
  startDate: string;
  endDate: string;
}

const todayStr = () => new Date().toISOString().split("T")[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

function formatDuration(minutes: number): string {
  if (!minutes) return "0 د";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س ${m} د`;
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function PageAbandonmentReport() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("today");
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [endDate, setEndDate] = useState<string>(todayStr());
  const [search, setSearch] = useState("");

  const handlePeriod = (p: "today" | "7d" | "30d") => {
    setPeriod(p);
    if (p === "today") {
      setStartDate(todayStr());
      setEndDate(todayStr());
    } else if (p === "7d") {
      setStartDate(daysAgo(6));
      setEndDate(todayStr());
    } else {
      setStartDate(daysAgo(29));
      setEndDate(todayStr());
    }
  };

  const url = `/api/attendance/withdrawals?startDate=${startDate}&endDate=${endDate}`;
  const { data, isLoading, isError } = useQuery<WithdrawalsResponse>({
    queryKey: ["/api/attendance/withdrawals", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل جلب البيانات");
      return res.json();
    },
  });

  const filteredSummary = useMemo(() => {
    const list = data?.summary || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      return (
        (s.username || "").toLowerCase().includes(q) ||
        (s.display_name || "").toLowerCase().includes(q) ||
        (s.display_name_ar || "").includes(search.trim())
      );
    });
  }, [data, search]);

  const filteredIncidents = useMemo(() => {
    const list = data?.withdrawals || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((w) => {
      return (
        (w.username || "").toLowerCase().includes(q) ||
        (w.display_name || "").toLowerCase().includes(q) ||
        (w.display_name_ar || "").includes(search.trim())
      );
    });
  }, [data, search]);

  const totals = useMemo(() => {
    return filteredSummary.reduce(
      (acc, s) => ({
        employees: acc.employees + 1,
        minutes: acc.minutes + s.total_minutes,
        incidents: acc.incidents + s.incident_count,
        violationDays: acc.violationDays + s.violation_days,
      }),
      { employees: 0, minutes: 0, incidents: 0, violationDays: 0 },
    );
  }, [filteredSummary]);

  const handleExport = () => {
    const headers = [
      "الموظف",
      "اسم المستخدم",
      "إجمالي الدقائق",
      "عدد الفترات",
      "أيام تجاوز 60 دقيقة",
    ];
    const lines = [headers.join(",")];
    for (const s of filteredSummary) {
      lines.push(
        [
          csvEscape(s.display_name_ar || s.display_name || s.username || s.user_id),
          csvEscape(s.username),
          csvEscape(s.total_minutes),
          csvEscape(s.incident_count),
          csvEscape(s.violation_days),
        ].join(","),
      );
    }
    lines.push("");
    lines.push(
      [
        "التاريخ",
        "الموظف",
        "بدأ في",
        "انتهى في",
        "المدة (دقيقة)",
        "السبب",
      ].join(","),
    );
    for (const w of filteredIncidents) {
      lines.push(
        [
          csvEscape(w.date),
          csvEscape(
            w.display_name_ar || w.display_name || w.username || w.user_id,
          ),
          csvEscape(w.started_at),
          csvEscape(w.ended_at ?? ""),
          csvEscape(w.duration_minutes ?? 0),
          csvEscape(w.reason ?? ""),
        ].join(","),
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `page-abandonment-${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            تقرير الانسحاب من صفحة الحضور
          </CardTitle>
          <CardDescription>
            عرض فترات تغيب الموظفين عن صفحة الحضور. عند تجاوز إجمالي الفترات
            60 دقيقة في اليوم يتم تسجيل مخالفة "page_abandonment" تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">الفترة</label>
              <Select
                value={period}
                onValueChange={(v) => handlePeriod(v as any)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="7d">آخر 7 أيام</SelectItem>
                  <SelectItem value="30d">آخر 30 يوماً</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">من تاريخ</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriod("today");
                }}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">إلى تاريخ</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriod("today");
                }}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-sm text-gray-600">بحث عن موظف</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="اسم الموظف أو اسم المستخدم"
                  className="pr-8"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isLoading || !data}
            >
              <Download className="w-4 h-4 ml-1" />
              تصدير CSV
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{totals.employees}</div>
                  <div className="text-xs text-gray-500">موظفون</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {formatDuration(totals.minutes)}
                  </div>
                  <div className="text-xs text-gray-500">إجمالي الانسحاب</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <Timer className="w-8 h-8 text-teal-500" />
                <div>
                  <div className="text-2xl font-bold">{totals.incidents}</div>
                  <div className="text-xs text-gray-500">عدد الفترات</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {totals.violationDays}
                  </div>
                  <div className="text-xs text-gray-500">أيام مخالفة</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ملخص حسب الموظف</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-gray-500">جاري التحميل...</div>
          ) : isError ? (
            <div className="text-center py-6 text-red-500">
              تعذر جلب البيانات
            </div>
          ) : filteredSummary.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              لا توجد فترات انسحاب خلال هذه الفترة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الموظف</TableHead>
                    <TableHead className="text-right">اسم المستخدم</TableHead>
                    <TableHead className="text-right">إجمالي الوقت</TableHead>
                    <TableHead className="text-right">عدد الفترات</TableHead>
                    <TableHead className="text-right">أيام مخالفة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell className="font-medium">
                        {s.display_name_ar ||
                          s.display_name ||
                          s.username ||
                          `#${s.user_id}`}
                      </TableCell>
                      <TableCell>{s.username ?? "-"}</TableCell>
                      <TableCell>
                        <span
                          className={
                            s.total_minutes > 60
                              ? "text-red-600 font-semibold"
                              : ""
                          }
                        >
                          {formatDuration(s.total_minutes)}
                        </span>
                      </TableCell>
                      <TableCell>{s.incident_count}</TableCell>
                      <TableCell>
                        {s.violation_days > 0 ? (
                          <Badge variant="destructive">
                            {s.violation_days}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">سجل الفترات</CardTitle>
          <CardDescription>
            كل فترة انسحاب مسجلة خلال النطاق المحدد
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-gray-500">جاري التحميل...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              لا توجد سجلات
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الموظف</TableHead>
                    <TableHead className="text-right">بدأ</TableHead>
                    <TableHead className="text-right">انتهى</TableHead>
                    <TableHead className="text-right">المدة</TableHead>
                    <TableHead className="text-right">السبب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.slice(0, 500).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        {format(new Date(w.date), "yyyy/MM/dd", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {w.display_name_ar ||
                          w.display_name ||
                          w.username ||
                          `#${w.user_id}`}
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
                        {formatDuration(w.duration_minutes || 0)}
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
              {filteredIncidents.length > 500 ? (
                <div className="text-xs text-gray-500 mt-2 text-center">
                  عرض أول 500 من أصل {filteredIncidents.length}. صدّر CSV
                  لعرض الكل.
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
