import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Clock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  ViolationsTab,
  RewardsTab,
  CustodyTab,
  TrainingTab,
  WagesTab,
  TraitsTab,
} from "./EmployeeFileTabs";

interface Props {
  userId: number;
  onBack: () => void;
}

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

export default function EmployeeFile({ userId, onBack }: Props) {
  const { isRTL } = useLanguage();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const Back = isRTL ? ArrowRight : ArrowLeft;
  const { first, last } = monthRange();
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(last);

  const { data: fileRes, isLoading: fileLoading } = useQuery<{ data: any }>({
    queryKey: ["/api/hr/employees", userId, "file"],
  });
  const { data: attRes, isLoading: attLoading } = useQuery<{ data: any }>({
    queryKey: ["/api/hr/attendance/summary", userId, { from, to }],
    enabled: !!from && !!to,
  });

  const file = fileRes?.data;
  const att = attRes?.data;

  const shiftName = (s: string | null) =>
    s === "day" ? L("نهارية", "Day") : s === "night" ? L("ليلية", "Night") : L("غير مجدول", "Unscheduled");

  const fmtTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString(isRTL ? "ar-SA" : "en-GB", {
        timeZone: "Asia/Riyadh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "—";
    }
  };

  const empName = file
    ? (isRTL ? file.display_name_ar : file.display_name) ||
      file.display_name ||
      file.username
    : "";

  const phase2Tabs: Array<{ key: string; ar: string; en: string }> = [
    { key: "violations", ar: "المخالفات", en: "Violations" },
    { key: "rewards", ar: "المكافآت", en: "Rewards" },
    { key: "custody", ar: "العهد", en: "Custody" },
    { key: "training", ar: "التدريب", en: "Training" },
    { key: "wages", ar: "الأجور", en: "Wages" },
    { key: "traits", ar: "السمات", en: "Traits" },
  ];

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        data-testid="button-back-to-directory"
      >
        <Back className="h-4 w-4 ml-1" />
        {L("رجوع للدليل", "Back to directory")}
      </Button>

      {fileLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !file ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {L("تعذر تحميل ملف الموظف", "Could not load employee file")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{empName}</span>
              {file.is_active ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  {L("نشط", "Active")}
                </Badge>
              ) : (
                <Badge variant="outline">{L("غير نشط", "Inactive")}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info icon={<Briefcase className="h-4 w-4" />} label={L("القسم", "Section")} value={(isRTL ? file.section_name_ar : file.section_name) || file.section_name || "—"} />
            <Info icon={<Briefcase className="h-4 w-4" />} label={L("الدور", "Role")} value={(isRTL ? file.role_name_ar : file.role_name) || file.role_name || "—"} />
            <Info icon={<Phone className="h-4 w-4" />} label={L("الهاتف", "Phone")} value={file.phone || "—"} />
            <Info icon={<Mail className="h-4 w-4" />} label={L("البريد", "Email")} value={file.email || "—"} />
            <Info icon={<CalendarDays className="h-4 w-4" />} label={L("وردية الشهر", "This month shift")} value={shiftName(file.current_shift)} />
            <Info icon={<CalendarClock className="h-4 w-4" />} label={L("منذ الإضافة للنظام", "In system since")} value={file.service_days != null ? L(`${file.service_days} يوم`, `${file.service_days} days`) : "—"} />
            <Info icon={<CalendarClock className="h-4 w-4" />} label={L("الإجازة القادمة", "Next leave")} value={file.next_leave_date || L("لا يوجد", "None")} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            {L("ملخص الحضور", "Attendance Summary")}
          </CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-auto" data-testid="input-att-from" />
            <span className="text-gray-400">—</span>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-auto" data-testid="input-att-to" />
          </div>
        </CardHeader>
        <CardContent>
          {attLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !att ? (
            <div className="py-6 text-center text-gray-500">
              {L("لا توجد بيانات", "No data")}
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label={L("أيام مجدولة", "Scheduled")} value={att.totals.scheduledDays} />
                <Stat label={L("حضور", "Present")} value={att.totals.presentDays} tone="green" />
                <Stat label={L("غياب", "Absent")} value={att.totals.absentDays} tone="red" />
                <Stat label={L("غير مكتمل", "Incomplete")} value={att.totals.incompleteDays} tone="amber" />
                <Stat label={L("ساعات العمل", "Worked (h)")} value={att.totals.totalWorkedHours} />
                <Stat label={L("ساعات إضافية", "Overtime (h)")} value={att.totals.totalOvertimeHours} tone="indigo" />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{L("التاريخ", "Date")}</TableHead>
                      <TableHead>{L("الوردية", "Shift")}</TableHead>
                      <TableHead>{L("الحالة", "Status")}</TableHead>
                      <TableHead>{L("دخول", "In")}</TableHead>
                      <TableHead>{L("خروج", "Out")}</TableHead>
                      <TableHead>{L("تأخير(د)", "Late(m)")}</TableHead>
                      <TableHead>{L("مغادرة مبكرة(د)", "Early(m)")}</TableHead>
                      <TableHead>{L("عمل(س)", "Worked(h)")}</TableHead>
                      <TableHead>{L("إضافي(س)", "OT(h)")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {att.days.map((d: any) => (
                      <TableRow key={d.date} data-testid={`row-att-${d.date}`}>
                        <TableCell className="whitespace-nowrap">{d.date}</TableCell>
                        <TableCell>{shiftName(d.shift)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{fmtTime(d.checkIn)}</TableCell>
                        <TableCell>{fmtTime(d.checkOut)}</TableCell>
                        <TableCell>{d.lateMinutes || 0}</TableCell>
                        <TableCell>{d.earlyLeaveMinutes || 0}</TableCell>
                        <TableCell>{d.workedHours || 0}</TableCell>
                        <TableCell>{d.overtimeHours || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {L("سجلات إضافية", "Additional Records")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={phase2Tabs[0].key} dir={isRTL ? "rtl" : "ltr"}>
            <TabsList className="flex flex-wrap">
              {phase2Tabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key} data-testid={`tab-${t.key}`}>
                  {L(t.ar, t.en)}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="violations">
              <ViolationsTab userId={userId} />
            </TabsContent>
            <TabsContent value="rewards">
              <RewardsTab userId={userId} />
            </TabsContent>
            <TabsContent value="custody">
              <CustodyTab userId={userId} />
            </TabsContent>
            <TabsContent value="training">
              <TrainingTab userId={userId} />
            </TabsContent>
            <TabsContent value="wages">
              <WagesTab userId={userId} />
            </TabsContent>
            <TabsContent value="traits">
              <TraitsTab userId={userId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-3">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "green" | "red" | "amber" | "indigo" }) {
  const toneClass =
    tone === "green"
      ? "text-green-700"
      : tone === "red"
        ? "text-red-700"
        : tone === "amber"
          ? "text-amber-700"
          : tone === "indigo"
            ? "text-indigo-700"
            : "text-gray-900 dark:text-gray-100";
  return (
    <div className="rounded-md border p-3 text-center">
      <div className={`text-xl font-bold ${toneClass}`}>{value ?? 0}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
