import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Boxes,
  Film,
  Printer,
  Scissors,
  Clock,
  RefreshCw,
  Search,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

import { useLocalizedName } from "../../hooks/use-localized-name";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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

interface FloorRollsResponse {
  rolls: FloorRoll[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const REFRESH_MS = 15000;
const PAGE_SIZE = 100;

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

const STAGE_ORDER = ["film", "printing", "cutting"] as const;

const ALL = "__all__";

function formatDateTime(
  value: string | null,
): { date: string; time: string } | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Riyadh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date, time };
}

function formatKg(value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(num)} كجم`;
}

export default function FloorRollsTracker() {
  const ln = useLocalizedName();
  const [page, setPage] = useState(0);
  const offset = page * PAGE_SIZE;
  const { data, isLoading, isFetching } = useQuery<FloorRollsResponse>({
    queryKey: ["/api/production/floor-rolls", { limit: PAGE_SIZE, offset }],
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });

  const rolls = data?.rolls ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = offset + rolls.length;

  // Total can shrink as rolls finish; snap back to the last page with data so
  // an out-of-range page never strands the viewer on an empty screen.
  if (page > 0 && rolls.length === 0 && total > 0 && !isFetching) {
    const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
    if (lastPage !== page) setPage(lastPage);
  }

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>(ALL);
  const [machineFilter, setMachineFilter] = useState<string>(ALL);
  const [customerFilter, setCustomerFilter] = useState<string>(ALL);

  // Build dropdown options from the currently-loaded rolls. Keyed by the
  // resolved localized name so duplicates collapse and the value is stable.
  const machineOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const roll of rolls) {
      const name = ln(roll.machine_name_ar, roll.machine_name);
      if (name) map.set(name, name);
    }
    return Array.from(map.keys()).sort((a, b) => a.localeCompare(b, "ar"));
  }, [rolls, ln]);

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const roll of rolls) {
      const name = ln(roll.customer_name_ar, roll.customer_name);
      if (name) map.set(name, name);
    }
    return Array.from(map.keys()).sort((a, b) => a.localeCompare(b, "ar"));
  }, [rolls, ln]);

  // Per-stage counts always reflect the full (unfiltered) dataset so the
  // stage chips act as a quick overview as well as a filter.
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const roll of rolls) {
      counts[roll.stage] = (counts[roll.stage] ?? 0) + 1;
    }
    return counts;
  }, [rolls]);

  const filteredRolls = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rolls.filter((roll) => {
      if (stageFilter !== ALL && roll.stage !== stageFilter) return false;

      if (machineFilter !== ALL) {
        const name = ln(roll.machine_name_ar, roll.machine_name);
        if (name !== machineFilter) return false;
      }

      if (customerFilter !== ALL) {
        const name = ln(roll.customer_name_ar, roll.customer_name);
        if (name !== customerFilter) return false;
      }

      if (query) {
        const rollNum = (roll.roll_number ?? "").toLowerCase();
        const poNum = (roll.production_order_number ?? "").toLowerCase();
        if (!rollNum.includes(query) && !poNum.includes(query)) return false;
      }

      return true;
    });
  }, [rolls, search, stageFilter, machineFilter, customerFilter, ln]);

  const hasActiveFilters =
    search.trim() !== "" ||
    stageFilter !== ALL ||
    machineFilter !== ALL ||
    customerFilter !== ALL;

  const clearFilters = () => {
    setSearch("");
    setStageFilter(ALL);
    setMachineFilter(ALL);
    setCustomerFilter(ALL);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Boxes className="h-5 w-5" />
          تتبع حي للرولات على أرض المصنع
          <Badge variant="secondary">
            {hasActiveFilters
              ? `${filteredRolls.length} / ${rolls.length}`
              : total}
          </Badge>
          {isFetching && (
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
          <span className="ms-auto text-xs font-normal text-muted-foreground">
            يتم التحديث تلقائياً
          </span>
        </CardTitle>

        {/* Filters & search */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={stageFilter === ALL ? "default" : "outline"}
              className="gap-1.5 h-8"
              onClick={() => setStageFilter(ALL)}
            >
              الكل
              <Badge variant="secondary" className="ms-1">
                {rolls.length}
              </Badge>
            </Button>
            {STAGE_ORDER.map((stage) => {
              const meta = stageMeta[stage];
              const StageIcon = meta.Icon;
              const active = stageFilter === stage;
              return (
                <Button
                  key={stage}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="gap-1.5 h-8"
                  onClick={() => setStageFilter(active ? ALL : stage)}
                >
                  <StageIcon className="h-3.5 w-3.5" />
                  {meta.label}
                  <Badge variant="secondary" className="ms-1">
                    {stageCounts[stage] ?? 0}
                  </Badge>
                </Button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث برقم الرول أو أمر الإنتاج"
                className="ps-9 h-9"
                data-testid="input-floor-rolls-search"
              />
            </div>

            <Select value={machineFilter} onValueChange={setMachineFilter}>
              <SelectTrigger
                className="h-9 w-[170px]"
                data-testid="select-floor-rolls-machine"
              >
                <SelectValue placeholder="المكينة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل المكائن</SelectItem>
                {machineOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger
                className="h-9 w-[170px]"
                data-testid="select-floor-rolls-customer"
              >
                <SelectValue placeholder="العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل العملاء</SelectItem>
                {customerOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1 h-9"
                onClick={clearFilters}
                data-testid="button-floor-rolls-clear"
              >
                <X className="h-3.5 w-3.5" />
                مسح
              </Button>
            )}
          </div>
        </div>
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
        ) : filteredRolls.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
            لا توجد رولات مطابقة للبحث
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
                <TableHead className="font-semibold">بواسطة</TableHead>
                <TableHead className="font-semibold text-center">
                  آخر تحديث
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRolls.map((roll) => {
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
                      {(() => {
                        const dt = formatDateTime(roll.last_updated_at);
                        if (!dt) return "غير محدد";
                        return (
                          <span className="inline-flex items-center justify-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span className="inline-flex flex-col leading-tight">
                              <span className="font-medium text-foreground">
                                {dt.date}
                              </span>
                              <span className="text-xs">{dt.time}</span>
                            </span>
                          </span>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!isLoading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 p-4 border-t">
            <span className="text-xs text-muted-foreground">
              عرض {rangeStart}–{rangeEnd} من {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0 || isFetching}
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!hasMore || isFetching}
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
