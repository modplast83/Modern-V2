import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Weight,
  CheckCircle2,
  AlertTriangle,
  Settings2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const MACHINE_STORAGE_KEY = "operator_focus_machine_id";

interface Machine {
  id: string;
  name_ar: string;
  type: string;
  status: string;
}

interface ActiveOrder {
  id: number;
  production_order_number: string;
  status: string;
  film_completed: boolean;
  quantity_kg: string;
  final_quantity_kg: string | null;
  overrun_percentage: string | null;
  size_caption: string;
  raw_material: string | null;
  master_batch_id: string | null;
  width_cm: string | null;
  thickness_micron: string | null;
  order_number: string;
  customer_name_ar: string;
  produced_quantity_kg: string;
  rolls_count: string;
}

export default function OperatorFocusView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    () => localStorage.getItem(MACHINE_STORAGE_KEY) || "",
  );
  const [weightInput, setWeightInput] = useState("");
  const [isLastRoll, setIsLastRoll] = useState(false);

  const handleMachineChange = (id: string) => {
    setSelectedMachineId(id);
    localStorage.setItem(MACHINE_STORAGE_KEY, id);
  };

  // Fetch available film machines for the picker
  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
    select: (data: any) => {
      const rows = Array.isArray(data) ? data : data?.data ?? [];
      return rows.filter(
        (m: Machine) => m.type === "film" && m.status !== "retired",
      );
    },
  });

  // Active production order on the selected machine
  const {
    data: activeOrder,
    isLoading,
    isFetching,
  } = useQuery<ActiveOrder | null>({
    queryKey: [`/api/production/active-by-machine/${selectedMachineId}`],
    enabled: !!selectedMachineId,
    refetchInterval: 30_000,
  });

  const createRollMutation = useMutation({
    mutationFn: async (payload: {
      weight_kg: number;
      is_last_roll: boolean;
    }) => {
      const endpoint = payload.is_last_roll
        ? "/api/rolls/create-final"
        : "/api/rolls/create-with-timing";
      const response = await apiRequest("POST", endpoint, {
        production_order_id: activeOrder!.id,
        film_machine_id: selectedMachineId,
        weight_kg: payload.weight_kg,
        is_last_roll: payload.is_last_roll,
        stage: "film",
      });
      return response.json();
    },
    onSuccess: (data) => {
      const rollNum = data.roll_number ?? data.roll?.roll_number ?? "—";
      toast({
        title: "✅ تم تسجيل اللفة بنجاح",
        description: `رقم الرول: ${rollNum}`,
      });
      setWeightInput("");
      setIsLastRoll(false);
      queryClient.invalidateQueries({
        queryKey: [
          `/api/production/active-by-machine/${selectedMachineId}`,
        ],
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ فشل تسجيل اللفة",
        description: error?.message || "تجاوزت الكمية المسموحة لأمر الإنتاج",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال وزن صحيح أكبر من الصفر",
        variant: "destructive",
      });
      return;
    }
    createRollMutation.mutate({ weight_kg: weight, is_last_roll: isLastRoll });
  };

  // ── Machine selector ──────────────────────────────────────────────────────
  const machinePicker = (
    <Card className="border border-slate-200 dark:border-slate-700">
      <CardContent className="flex items-center gap-3 py-3">
        <Settings2 className="h-5 w-5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium shrink-0">الماكينة:</span>
        <Select value={selectedMachineId} onValueChange={handleMachineChange}>
          <SelectTrigger className="h-9 max-w-xs">
            <SelectValue placeholder="اختر الماكينة لهذه الوردية…" />
          </SelectTrigger>
          <SelectContent>
            {machines.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name_ar} ({m.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFetching && (
          <span className="text-xs text-muted-foreground">جاري التحديث…</span>
        )}
      </CardContent>
    </Card>
  );

  // ── No machine selected ───────────────────────────────────────────────────
  if (!selectedMachineId) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4" dir="rtl">
        {machinePicker}
        <Card className="border-2 border-dashed border-slate-300 text-center p-8">
          <CardHeader>
            <CardTitle className="text-xl text-muted-foreground">
              اختر الماكينة للبدء
            </CardTitle>
            <CardDescription>
              حدد الماكينة التي ستعمل عليها خلال هذه الوردية
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4" dir="rtl">
        {machinePicker}
        <div className="p-8 text-center text-lg text-muted-foreground">
          جاري تحميل بيانات خط الإنتاج…
        </div>
      </div>
    );
  }

  // ── No active order ───────────────────────────────────────────────────────
  if (!activeOrder) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4" dir="rtl">
        {machinePicker}
        <Card className="border-2 border-dashed border-yellow-400 bg-yellow-50/30 dark:bg-yellow-900/10 text-center p-8">
          <CardHeader className="flex items-center justify-center">
            <AlertTriangle className="h-14 w-14 text-yellow-500 animate-bounce" />
            <CardTitle className="text-2xl mt-4 text-yellow-800 dark:text-yellow-400">
              لا يوجد أمر إنتاج نشط
            </CardTitle>
            <CardDescription className="text-base text-yellow-700 dark:text-yellow-500">
              لا يوجد أمر إنتاج مخصص حالياً للماكينة ({selectedMachineId}).
              يرجى مراجعة مشرف الصالة للتخصيص.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ── Active order view ─────────────────────────────────────────────────────
  const targetQty = parseFloat(
    activeOrder.final_quantity_kg || activeOrder.quantity_kg || "0",
  );
  const producedQty = parseFloat(activeOrder.produced_quantity_kg || "0");
  const progressPercent =
    targetQty > 0 ? Math.min(100, (producedQty / targetQty) * 100) : 0;
  const rollsCount = parseInt(activeOrder.rolls_count || "0", 10);

  return (
    <div className="max-w-2xl mx-auto space-y-4 p-2 md:p-4" dir="rtl">
      {machinePicker}

      {/* ── Order identity card ── */}
      <Card className="border-2 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="pt-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <div>
              <span className="text-xs text-slate-400 block">
                رقم أمر الإنتاج
              </span>
              <span className="text-2xl font-black tracking-wider text-cyan-400">
                {activeOrder.production_order_number}
              </span>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-400 block">المواصفات</span>
              <span className="text-base font-bold bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30">
                {activeOrder.size_caption || "—"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">
                الخامة
              </span>
              <span className="text-sm font-bold text-slate-200">
                {activeOrder.raw_material || "HDPE"}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">
                اللون
              </span>
              <span className="text-sm font-bold text-emerald-400">
                {activeOrder.master_batch_id || "شفاف"}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 block mb-1">
                العميل
              </span>
              <span className="text-xs font-bold text-slate-300 leading-tight">
                {activeOrder.customer_name_ar}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Progress counter ── */}
      <Card className="border-2 shadow-lg text-center">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            الوزن المنتج للوردية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-center items-baseline gap-2">
            <span className="text-5xl font-black text-primary tracking-tight">
              {producedQty.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground font-bold">
              / {targetQty.toFixed(0)} كجم
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground px-1">
              <span>{rollsCount} رول مسجل</span>
              <span>{progressPercent.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercent} className="h-4 border border-slate-200 dark:border-slate-700" />
          </div>
        </CardContent>
      </Card>

      {/* ── Roll entry form ── */}
      <Card className="border-2 border-primary/30 shadow-xl bg-slate-50 dark:bg-slate-900/20">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Weight className="h-5 w-5 text-primary" />
                وزن الرول المنتج (كجم):
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="0.0"
                className="text-4xl h-20 text-center font-black rounded-xl border-2 border-primary/40 focus-visible:ring-primary shadow-inner"
                autoFocus
                disabled={createRollMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-2 rounded-xl gap-4">
              <div className="flex items-center gap-3 flex-1">
                <CheckCircle2
                  className={`h-6 w-6 shrink-0 ${isLastRoll ? "text-amber-500" : "text-slate-300"}`}
                />
                <div>
                  <span className="font-black text-sm block">
                    هل هذا هو الرول النهائي؟
                  </span>
                  <span className="text-xs text-muted-foreground">
                    سيغلق مرحلة الفيلم تلقائياً عند التأكيد.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isLastRoll}
                onChange={(e) => setIsLastRoll(e.target.checked)}
                className="w-6 h-6 rounded accent-primary cursor-pointer"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-16 text-lg font-black rounded-xl shadow-lg transition-transform active:scale-95"
              disabled={createRollMutation.isPending}
            >
              {createRollMutation.isPending
                ? "جاري الحفظ…"
                : "💾 حفظ اللفة وإصدار الملصق"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
