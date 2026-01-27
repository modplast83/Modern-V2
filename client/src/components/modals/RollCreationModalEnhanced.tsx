import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../../hooks/use-toast";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Machine } from "../../../../shared/schema";
import { safeParseFloat, formatNumberAr } from "../../../../shared/number-utils";
import { AlertTriangle, Clock, Package } from "lucide-react";
import { toastMessages } from "../../lib/toastMessages";

interface RollCreationModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  productionOrderId: number;
  productionOrderData?: any;
  isFinalRoll?: boolean;
}

const rollFormSchema = z.object({
  weight_kg: z
    .string()
    .min(1, "يرجى إدخال الوزن")
    .refine((val) => {
      const num = safeParseFloat(val.replace(",", "."), -1);
      return num > 0;
    }, "الوزن يجب أن يكون رقمًا أكبر من 0"),
  film_machine_id: z.string().min(1, "يرجى اختيار ماكينة الفيلم"),
  is_final_roll: z.boolean().default(false),
});

export type RollFormData = z.infer<typeof rollFormSchema>;

export default function RollCreationModalEnhanced({
  isOpen,
  onClose,
  productionOrderId,
  productionOrderData,
  isFinalRoll = false,
}: RollCreationModalEnhancedProps) {
  const { toast } = useToast();
  const [lastProductionTime, setLastProductionTime] = useState<number | null>(null);

  const form = useForm<RollFormData>({
    resolver: zodResolver(rollFormSchema),
    defaultValues: {
      weight_kg: "",
      film_machine_id: "",
      is_final_roll: isFinalRoll,
    },
    mode: "onChange",
  });

  // Set final roll checkbox when prop changes
  useEffect(() => {
    form.setValue("is_final_roll", isFinalRoll);
  }, [isFinalRoll, form]);

  // Fetch machines
  const { data: machines = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Filter film machines only (section_id = "SEC03" for film section)
  const filmMachines = useMemo(() => {
    return machines.filter(m => m.section_id === "SEC03" && m.status === "active");
  }, [machines]);

  // Calculate remaining quantity
  const remainingQuantity = useMemo(() => {
    if (!productionOrderData) return 0;
    const required = Number(productionOrderData.final_quantity_kg || productionOrderData.quantity_kg || 0);
    const produced = Number(productionOrderData.total_weight_produced || 0);
    return Math.max(0, required - produced);
  }, [productionOrderData]);

  // Suggest roll number
  const suggestedRollNumber = useMemo(() => {
    if (!productionOrderData) return "";
    const rollsCount = productionOrderData.rolls_count || 0;
    return `${productionOrderData.production_order_number}-R${String(rollsCount + 1).padStart(3, "0")}`;
  }, [productionOrderData]);

  // Calculate average production time
  const averageProductionTime = useMemo(() => {
    if (!productionOrderData?.production_start_time || !productionOrderData?.rolls_count) {
      return null;
    }
    const startTime = new Date(productionOrderData.production_start_time).getTime();
    const currentTime = Date.now();
    const totalMinutes = Math.floor((currentTime - startTime) / (1000 * 60));
    return Math.floor(totalMinutes / productionOrderData.rolls_count);
  }, [productionOrderData]);

  // Set default weight to remaining quantity
  useEffect(() => {
    if (!form.getValues("weight_kg") && remainingQuantity > 0) {
      form.setValue("weight_kg", String(remainingQuantity));
    }
  }, [remainingQuantity, form]);

  // Create roll mutation
  const createRollMutation = useMutation({
    mutationFn: async (data: RollFormData) => {
      const weightParsed = Number.parseFloat(data.weight_kg.replace(",", "."));
      
      // Choose endpoint based on whether it's a final roll
      const endpoint = data.is_final_roll 
        ? "/api/rolls/create-final"
        : "/api/rolls/create-with-timing";
      
      const response = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          production_order_id: productionOrderId,
          weight_kg: weightParsed,
          film_machine_id: data.film_machine_id,
          is_last_roll: data.is_final_roll,
        }),
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "فشل في إنشاء الرول");
      }
      return response.json();
    },
    onSuccess: (data) => {
      const rollNumber = data.roll_number || "";
      const message = data.is_last_roll 
        ? toastMessages.rolls.finalRollCreated(rollNumber)
        : toastMessages.rolls.created(rollNumber);
        
      toast({ 
        title: message.title, 
        description: message.description,
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders/active-for-operator"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rolls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-queues"] });
      
      onClose();
      form.reset();
    },
    onError: (error: unknown) => {
      console.error("Roll creation error:", error);
      toast({
        title: "خطأ في إنشاء الرول",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: RollFormData) => {
    // Warn if creating final roll with significant remaining quantity
    if (data.is_final_roll && remainingQuantity > 50) {
      if (!confirm(`لا يزال هناك ${formatNumberAr(remainingQuantity)} كجم متبقية. هل أنت متأكد من إنشاء آخر رول؟`)) {
        return;
      }
    }
    createRollMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {isFinalRoll ? "إنشاء آخر رول" : "إنشاء رول جديد"}
          </DialogTitle>
          <DialogDescription>
            {productionOrderData && (
              <div className="mt-2 space-y-1 text-sm">
                <p>أمر الإنتاج: {productionOrderData.production_order_number}</p>
                <p>المنتج: {productionOrderData.product_name}</p>
                <p>العميل: {productionOrderData.customer_name}</p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Suggested Roll Number */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                رقم الرول المقترح: <strong>{suggestedRollNumber}</strong>
              </p>
            </div>

            {/* Production Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-600" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">الكمية المتبقية</p>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatNumberAr(remainingQuantity)} كجم
                </p>
                {remainingQuantity < 50 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    اقتربت من إكمال الكمية
                  </p>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">متوسط وقت الإنتاج</p>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {averageProductionTime ? `${averageProductionTime} دقيقة` : "غير متاح"}
                </p>
              </div>
            </div>

            {/* Weight Input */}
            <FormField
              control={form.control}
              name="weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوزن (كجم)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="أدخل وزن الرول"
                      className="text-right"
                      data-testid="input-weight"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Machine Selection */}
            <FormField
              control={form.control}
              name="film_machine_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ماكينة الفيلم</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={machinesLoading}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-machine">
                        <SelectValue placeholder="اختر الماكينة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filmMachines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.name_ar || machine.name} - {machine.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Final Roll Checkbox */}
            {!isFinalRoll && productionOrderData?.rolls_count > 0 && (
              <FormField
                control={form.control}
                name="is_final_roll"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-final-roll"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none mr-2">
                      <FormLabel className="cursor-pointer">
                        هذا آخر رول في أمر الإنتاج
                      </FormLabel>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        سيتم إغلاق مرحلة الفيلم وحساب وقت الإنتاج الكلي
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Warning for final roll */}
            {(form.watch("is_final_roll") || isFinalRoll) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm text-amber-900 dark:text-amber-100">
                    <p className="font-semibold">تنبيه: آخر رول</p>
                    <p>بعد إنشاء هذا الرول:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>سيتم إغلاق مرحلة الفيلم لهذا الأمر</li>
                      <li>لن يمكن إنشاء رولات جديدة</li>
                      <li>سيتم حساب وقت الإنتاج الكلي</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createRollMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createRollMutation.isPending}
                data-testid="button-submit-roll"
                variant={form.watch("is_final_roll") || isFinalRoll ? "destructive" : "default"}
              >
                {createRollMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  form.watch("is_final_roll") || isFinalRoll ? "إنشاء آخر رول" : "إنشاء الرول"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}