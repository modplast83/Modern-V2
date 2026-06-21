import { useQuery } from "@tanstack/react-query";
import { Boxes, Film, Printer, Scissors, Clock, RefreshCw } from "lucide-react";

import { useLocalizedName } from "../../hooks/use-localized-name";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface FloorRoll {
  id: number;
  roll_number: string | null;
  roll_seq: number | null;
  stage: string;
  weight_kg: string | number | null;
  cut_weight_total_kg: string | number | null;
  last_updated_at: string | null;
  production_order_number: string | null;
  customer_name: string | null;
  customer_name_ar: string | null;
  machine_name: string | null;
  machine_name_ar: string | null;
  employee_name: string | null;
}

const REFRESH_MS = 15000;

const stageMeta: Record<
  string,
  { label: string; className: string; Icon: typeof Film }
> = {
  film: {
    label: "فيلم",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Icon: Film,
  },
  printing: {
    label: "طباعة",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    Icon: Printer,
  },
  cutting: {
    label: "تقطيع",
    className: "bg-purple-100 text-purple-800 border-purple-200",
    Icon: Scissors,
  },
};

function formatRelativeAr(value: string | null): string {
  if (!value) return "غير محدد";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "غير محدد";
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));

  if (diffSec < 60) return "الآن";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)
    return diffMin === 1 ? "منذ دقيقة" : `منذ ${diffMin} دقيقة`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr === 1 ? "منذ ساعة" : `منذ ${diffHr} ساعة`;
  const diffDay = Math.floor(diffHr / 24);
  return diffDay === 1 ? "منذ يوم" : `منذ ${diffDay} يوم`;
}

function formatKg(value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num)} كجم`;
}

export default function FloorRollsTracker() {
  const ln = useLocalizedName();
  const {
    data: rolls = [],
    isLoading,
    isFetching,
  } = useQuery<FloorRoll[]>({
    queryKey: ["/api/production/floor-rolls"],
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Boxes className="h-5 w-5" />
          تتبع حي للرولات على أرض المصنع
          <Badge variant="secondary">{rolls.length}</Badge>
          {isFetching && (
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
          <span className="ms-auto text-xs font-normal text-muted-foreground">
            يتم التحديث تلقائياً
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-8 w-20 rounded bg-muted" />
                <div className="h-4 flex-1 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : rolls.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Boxes className="h-10 w-10 mx-auto mb-2 opacity-30" />
            لا توجد رولات على أرض المصنع حالياً
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">رقم الرول</TableHead>
                <TableHead className="font-semibold">أمر الإنتاج</TableHead>
                <TableHead className="font-semibold">العميل</TableHead>
                <TableHead className="font-semibold text-center">
                  الحالة
                </TableHead>
                <TableHead className="font-semibold text-center">
                  الوزن
                </TableHead>
                <TableHead className="font-semibold">المكينة</TableHead>
                <TableHead className="font-semibold">المسؤول</TableHead>
                <TableHead className="font-semibold text-center">
                  آخر تحديث
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolls.map((roll) => {
                const meta = stageMeta[roll.stage];
                const StageIcon = meta?.Icon ?? Boxes;
                return (
                  <TableRow key={roll.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {roll.roll_number || "غير محدد"}
                    </TableCell>
                    <TableCell>
                      {roll.production_order_number || "غير محدد"}
                    </TableCell>
                    <TableCell>
                      {ln(roll.customer_name_ar, roll.customer_name) || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`gap-1 ${meta?.className ?? ""}`}
                      >
                        <StageIcon className="h-3.5 w-3.5" />
                        {meta?.label ?? roll.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {formatKg(roll.weight_kg)}
                    </TableCell>
                    <TableCell>
                      {ln(roll.machine_name_ar, roll.machine_name) || "—"}
                    </TableCell>
                    <TableCell>{roll.employee_name || "—"}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeAr(roll.last_updated_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
