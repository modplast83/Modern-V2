import { useEffect, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, Sun, Moon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { userHasPermission } from "@/utils/roleUtils";
import { useLanguage } from "../../contexts/LanguageContext";

type Shift = "day" | "night";

interface HREmployee {
  id: number;
  username: string;
  display_name: string | null;
  display_name_ar: string | null;
  section_name: string | null;
  section_name_ar: string | null;
}

interface ShiftAssignment {
  user_id: number;
  shift: Shift;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ShiftRoster() {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const canManage = userHasPermission(user, ["manage_attendance", "manage_hr"]);

  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [year, month] = monthValue
    .split("-")
    .map((v) => parseInt(v, 10)) as [number, number];

  const [assignments, setAssignments] = useState<Record<number, Shift | "">>(
    {},
  );

  const { data: empRes, isLoading: empLoading } = useQuery<{
    data: HREmployee[];
  }>({ queryKey: ["/api/hr/employees"] });

  const { data: shiftRes, isLoading: shiftLoading } = useQuery<{
    data: ShiftAssignment[];
  }>({
    queryKey: ["/api/hr/shifts", { year, month }],
    enabled: !!year && !!month,
  });

  useEffect(() => {
    const map: Record<number, Shift | ""> = {};
    (shiftRes?.data ?? []).forEach((a) => {
      map[a.user_id] = a.shift;
    });
    setAssignments(map);
  }, [shiftRes]);

  const empName = (e: HREmployee) =>
    (isRTL ? e.display_name_ar : e.display_name) ||
    e.display_name ||
    e.username;

  const saveMutation = useMutation({
    mutationFn: async () => {
      // نرسل جميع الموظفين (بما فيهم "غير مجدول") ليكون الحفظ مرجعياً للشهر:
      // الورديات day/night تُضاف/تُحدّث، و"none" تُلغي الجدولة (حذف).
      const payload = {
        year,
        month,
        assignments: (empRes?.data ?? []).map((e) => ({
          user_id: e.id,
          shift: assignments[e.id] || "none",
        })),
      };
      const res = await apiRequest("/api/hr/shifts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || L("فشل الحفظ", "Save failed"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({
        title: L("تم الحفظ", "Saved"),
        description: L("تم حفظ جدول الورديات", "Shift roster saved"),
      });
    },
    onError: (e: Error) => {
      toast({
        variant: "destructive",
        title: L("خطأ", "Error"),
        description: e.message,
      });
    },
  });

  const setQuickAll = (shift: Shift | "") => {
    const map: Record<number, Shift | ""> = {};
    (empRes?.data ?? []).forEach((e) => {
      map[e.id] = shift;
    });
    setAssignments(map);
  };

  const isLoading = empLoading || shiftLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>{L("جدول الورديات الشهري", "Monthly Shift Roster")}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="w-auto"
              data-testid="input-roster-month"
            />
            {canManage && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickAll("day")}
                  data-testid="button-all-day"
                >
                  <Sun className="h-4 w-4 ml-1" />
                  {L("الكل نهاري", "All Day")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickAll("night")}
                  data-testid="button-all-night"
                >
                  <Moon className="h-4 w-4 ml-1" />
                  {L("الكل ليلي", "All Night")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-roster"
                >
                  <Save className="h-4 w-4 ml-1" />
                  {saveMutation.isPending
                    ? L("جارٍ الحفظ...", "Saving...")
                    : L("حفظ", "Save")}
                </Button>
              </>
            )}
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
        ) : (empRes?.data ?? []).length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            {L("لا يوجد موظفون", "No employees")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L("الموظف", "Employee")}</TableHead>
                  <TableHead>{L("القسم", "Section")}</TableHead>
                  <TableHead className="w-48">{L("الوردية", "Shift")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(empRes?.data ?? []).map((e) => (
                  <TableRow key={e.id} data-testid={`row-roster-${e.id}`}>
                    <TableCell className="font-medium">{empName(e)}</TableCell>
                    <TableCell>
                      {(isRTL ? e.section_name_ar : e.section_name) ||
                        e.section_name ||
                        "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={assignments[e.id] || "none"}
                        onValueChange={(v) =>
                          setAssignments((prev) => ({
                            ...prev,
                            [e.id]: v === "none" ? "" : (v as Shift),
                          }))
                        }
                        disabled={!canManage}
                      >
                        <SelectTrigger
                          className="w-44"
                          data-testid={`select-shift-${e.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {L("غير مجدول", "Unscheduled")}
                          </SelectItem>
                          <SelectItem value="day">
                            {L("نهارية", "Day")}
                          </SelectItem>
                          <SelectItem value="night">
                            {L("ليلية", "Night")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
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
