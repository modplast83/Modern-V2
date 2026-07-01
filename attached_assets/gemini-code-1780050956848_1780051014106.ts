import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Scan, Package, Weight, Layers, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OperatorFocusViewProps {
  machineId: string; // يتم تمريرها بناء على الماكينة التي سجل عليها العامل الدخول
}

export default function OperatorFocusView({ machineId }: OperatorFocusViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weightInput, setWeightInput] = useState("");
  const [isLastRoll, setIsLastRoll] = useState(false);

  // 1. جلب أمر الإنتاج النشط حالياً على هذه الماكينة فقط
  const { data: activeOrder, isLoading } = useQuery({
    queryKey: [`/api/production/active-by-machine/${machineId}`],
    queryFn: async () => {
      // نطلب من الخادم جلب الأمر المخصص حالياً للماكينة
      const res = await fetch(`/api/production-orders?assigned_machine_id=${machineId}&status=active`);
      const data = await res.json();
      return data[0] || null; // أول أمر نشط في الطابور
    }
  });

  // 2. إنشاء رول جديد بوزن محدد
  const createRollMutation = useMutation({
    mutationFn: async (payload: { weight_kg: number; is_last_roll: boolean }) => {
      const endpoint = payload.is_last_roll ? "/api/rolls/create-final" : "/api/rolls/create-with-timing";
      const response = await apiRequest("POST", endpoint, {
        production_order_id: activeOrder.id,
        film_machine_id: machineId,
        weight_kg: payload.weight_kg,
        is_last_roll: payload.is_last_roll,
        stage: "film"
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ تم تسجيل اللفة بنجاح",
        description: `رقم الرول الناتج: ${data.roll_number || data.roll?.roll_number}`,
        variant: "default"
      });
      setWeightInput("");
      setIsLastRoll(false);
      // إعادة تحديث البيانات والعدادات فوراً
      queryClient.invalidateQueries({ queryKey: [`/api/production/active-by-machine/${machineId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ فشل تسجيل اللفة",
        description: error.message || "تجاوزت الكمية المسموحة لأمر الإنتاج",
        variant: "destructive"
      });
    }
  });

  const handleSubmitRoll = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال وزن صحيح أكبر من الصفر", variant: "destructive" });
      return;
    }
    createRollMutation.mutate({ weight_kg: weight, is_last_roll: isLastRoll });
  };

  if (isLoading) return <div className="p-8 text-center text-lg">جاري تحميل بيانات خط الإنتاج...</div>;

  if (!activeOrder) {
    return (
      <Card className="border-2 border-dashed border-yellow-500 max-w-xl mx-auto mt-12 text-center p-8 bg-yellow-50/30">
        <CardHeader className="flex items-center justify-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 animate-bounce" />
          <CardTitle className="text-2xl mt-4 text-yellow-800">لا يوجد أمر إنتاج نشط</CardTitle>
          <CardDescription className="text-base text-yellow-700">
            لا يوجد أمر إنتاج مخصص حالياً للماكينة رقم ({machineId}). يرجى مراجعة مشرف الصالة للتخصيص.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // حساب الحجم الفعلي والنسبة المئوية للإنجاز
  const targetQty = parseFloat(activeOrder.final_quantity_kg || activeOrder.quantity_kg || "0");
  const producedQty = parseFloat(activeOrder.produced_quantity_kg || "0");
  const progressPercent = Math.min(100, (producedQty / targetQty) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-2 md:p-4" dir="rtl">
      
      {/* 1. بيانات أمر الإنتاج الحالي واضحة جداً وبخط كبير لبيئة المصنع */}
      <Card className="border-2 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <div>
              <span className="text-xs text-slate-400 block">رقم أمر الإنتاج</span>
              <span className="text-2xl font-black tracking-wider text-cyan-400">{activeOrder.production_order_number}</span>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-400 block">المواصفات الفنية</span>
              <span className="text-lg font-bold bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30">
                {activeOrder.customerProduct?.size_caption || "مقاس قياسي"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-sm text-slate-400 block mb-1">المادة الخام</span>
              <span className="text-xl font-bold text-slate-200">{activeOrder.customerProduct?.raw_material || "HDPE"}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-sm text-slate-400 block mb-1">اللون المطلـوب</span>
              <span className="text-xl font-bold text-emerald-400">{activeOrder.customerProduct?.master_batch_id || "شفاف"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. العداد الرقمي الضخم للإنجاز لمنع التشتت */}
      <Card className="border-2 shadow-lg text-center">
        <CardHeader className="pb-2">
          <CardTitle className="text-md text-muted-foreground">مراقبة وزن الإنتاج الفعلي للوردية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center items-baseline gap-2">
            <span className="text-6xl font-black text-primary tracking-tight">{producedQty.toFixed(1)}</span>
            <span className="text-xl text-muted-foreground font-bold">/ {targetQty.toFixed(0)} كجم</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-muted-foreground px-1">
              <span>نسبة الإنجاز المستهدفة</span>
              <span>{progressPercent.toFixed(1)}%</span>
            </div>
            <Progress value={progressPercent} className="h-4 border border-slate-200" />
          </div>
        </CardContent>
      </Card>

      {/* 3. نافذة العمل الكبيرة: زر إدخال ومسح فوري بدون جداول */}
      <Card className="border-3 border-primary/30 shadow-2xl bg-slate-50 dark:bg-slate-900/20">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmitRoll} className="space-y-6">
            <div className="space-y-2">
              <label className="text-lg font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Weight className="h-5 w-5 text-primary" />
                أدخل وزن الرول المنتج حالياً (كجم):
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="0.0"
                  className="text-4xl h-20 text-center font-black rounded-xl border-2 border-primary focus-visible:ring-primary shadow-inner"
                  autoFocus
                  disabled={createRollMutation.isPending}
                />
              </div>
            </div>

            {/* مفتاح تحديد الرول الأخير لإغلاق المرحلة برمجياً */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-2 rounded-xl">
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`h-6 w-6 ${isLastRoll ? "text-amber-500" : "text-slate-300"}`} />
                <div>
                  <span className="font-black text-md block">هل هذا هو الرول النهائي؟</span>
                  <span className="text-xs text-muted-foreground">تفعيل هذا الخيار سيقوم بإغلاق مرحلة الفيلم تلقائياً بناء على رغبتك.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isLastRoll}
                onChange={(e) => setIsLastRoll(e.target.checked)}
                className="w-6 h-6 rounded-lg text-primary focus:ring-primary accent-primary cursor-pointer"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-16 text-xl font-black rounded-xl shadow-lg transition-transform active:scale-95"
              disabled={createRollMutation.isPending}
            >
              {createRollMutation.isPending ? "جاري تسجيل اللفة بالخلفية..." : "💾 حفظ اللفة وإصدار الملصق وطباعة الباركود"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}