import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Search, FileUser } from "lucide-react";

import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useLanguage } from "../../contexts/LanguageContext";

interface HREmployee {
  id: number;
  username: string;
  display_name: string | null;
  display_name_ar: string | null;
  role_name: string | null;
  role_name_ar: string | null;
  section_name: string | null;
  section_name_ar: string | null;
  current_shift: "day" | "night" | null;
  is_active: boolean;
}

interface Props {
  onSelect: (id: number) => void;
}

export default function EmployeeDirectory({ onSelect }: Props) {
  const { isRTL } = useLanguage();
  const L = (ar: string, en: string) => (isRTL ? ar : en);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ data: HREmployee[] }>({
    queryKey: ["/api/hr/employees"],
  });

  const empName = (e: HREmployee) =>
    (isRTL ? e.display_name_ar : e.display_name) ||
    e.display_name ||
    e.username;

  const filtered = useMemo(() => {
    const list = data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        empName(e).toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.section_name_ar || e.section_name || "")
          .toLowerCase()
          .includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, isRTL]);

  const shiftBadge = (shift: "day" | "night" | null) => {
    if (!shift)
      return (
        <Badge variant="outline" className="text-gray-500">
          {L("غير مجدول", "Unscheduled")}
        </Badge>
      );
    return shift === "day" ? (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        {L("نهارية", "Day")}
      </Badge>
    ) : (
      <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
        {L("ليلية", "Night")}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute top-2.5 h-4 w-4 text-gray-400 ltr:left-2.5 rtl:right-2.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L("بحث عن موظف...", "Search employee...")}
            className="ltr:pl-8 rtl:pr-8"
            data-testid="input-employee-search"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            {L("لا يوجد موظفون", "No employees found")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L("الموظف", "Employee")}</TableHead>
                  <TableHead>{L("القسم", "Section")}</TableHead>
                  <TableHead>{L("الدور", "Role")}</TableHead>
                  <TableHead>{L("وردية الشهر", "Shift")}</TableHead>
                  <TableHead>{L("الحالة", "Status")}</TableHead>
                  <TableHead className="text-center">
                    {L("الملف", "File")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} data-testid={`row-employee-${e.id}`}>
                    <TableCell className="font-medium">{empName(e)}</TableCell>
                    <TableCell>
                      {(isRTL ? e.section_name_ar : e.section_name) ||
                        e.section_name ||
                        "—"}
                    </TableCell>
                    <TableCell>
                      {(isRTL ? e.role_name_ar : e.role_name) ||
                        e.role_name ||
                        "—"}
                    </TableCell>
                    <TableCell>{shiftBadge(e.current_shift)}</TableCell>
                    <TableCell>
                      {e.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          {L("نشط", "Active")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          {L("غير نشط", "Inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelect(e.id)}
                        data-testid={`button-open-file-${e.id}`}
                      >
                        <FileUser className="h-4 w-4 ml-1" />
                        {L("فتح", "Open")}
                      </Button>
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
